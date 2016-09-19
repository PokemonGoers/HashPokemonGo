"use strict";
/**
 * Created by dowling on 28/08/16.
 */
var Rx = require("rxjs");

function RxfromIO (io, eventName) {
    return Rx.Observable.create(observer => {
            io.on(eventName, (data) => {
            observer.next(data)
});
    return {
        dispose: io.close
    }
});
}


function MobDetection(options){
    var moduleExports = {};
    var io = options.io || require('socket.io')(options.port || 3000);
    var utils = require("../util/util");


    // minimum number of close-by tweets in a cluster required for it to become a mob
    var mobSizeThreshold = options.mobSizeThreshold || 5;

    // maximum number of seconds that can pass between two tweets in a cluster before the cluster is deleted again
    var maxClusterAge = options.maxClusterAge ||5 * 60; // seconds

    // max number of meters between two tweets for them to be in the same cluster
    var maxDistanceThreshold = options.maxDistanceThreshold || 300;



    var merge = function (cluster, newTweet) {
        var tweeters = [];
        for (var i in cluster.tweets){
            var tweet = cluster.tweets[i];
            if (tweeters.indexOf(tweet.user) != 1){
                tweeters.push(tweet.user);
            }
        }
        var numTweeters = tweeters.length;

        // update timestamp
        cluster.timestamp = newTweet.timestamp;

        var oldWeight = 2.;
        var newWeight = 1.;

        // update moving average mob location
        cluster.coordinates[0] = (
                oldWeight * cluster.coordinates[0] + newWeight * newTweet.coordinates[0]
            ) / (oldWeight + newWeight);

        cluster.coordinates[1] = (
                oldWeight * cluster.coordinates[1] + newWeight * newTweet.coordinates[1]
            ) / (oldWeight + newWeight);

        // track tweet
        cluster.tweets.push(newTweet);

        // see if the cluster is big enough to become a mob
        cluster.isMob = numTweeters + 1 > mobSizeThreshold;

        return cluster;
    };


    moduleExports.listeners = [];

    io.of("/mobs").on("connection", function (socket) {
        socket.on("settings", function (settings) {
            if(settings.mode == "all"){
                console.log("Got new connection for all!");
                moduleExports.listeners.push(
                    {socket: socket, coordinates: "all", radius: null}
                );
            }else if (settings.mode == "geo"){
                console.log("Got new connection for (" + settings.lat +", " + settings.lon + "), " + settings.radius+" !");
                moduleExports.listeners.push(
                    {
                        socket: socket,
                        coordinates: [settings.lon, settings.lat],
                        radius: settings.radius || 10000
                    }
                );
            }
        })
    });

    io.of("/mobs").on("disconnect", function (socket){
        console.log("Trying to remove socket " + socket.id);
        var i = moduleExports.listeners.length;
        while (i--){
            var listener = moduleExports.listeners[i];
            if (listener.socket == socket) {
                moduleExports.listeners.splice(i, 1);
                console.log("Removed socket " + socket.id);
                return;
            }
        }
    });


    moduleExports.startPokeMobDetection = function (stream, onError) {
        moduleExports.clusters = {};
        moduleExports.maxClusterId = 0;

        var notifyClients = function(cluster, channel){
            for (var i in moduleExports.listeners){
                var listener = moduleExports.listeners[i];
                if (listener.coordinates == "all" || utils.haversineDistance(listener.coordinates, cluster.coordinates) <= listener.radius) {
                    listener.socket.emit(channel, cluster);
                }
            }
        };

        // clear out expired clusters
        var clearOldClusters = function(tweet) {
            let now = Math.floor(Date.now() / 1000);
            for (var clusterId in  Object.getOwnPropertyNames(moduleExports.clusters)) {
                if (now - moduleExports.clusters[clusterId].timestamp > maxClusterAge) {
                    delete moduleExports.clusters[clusterId];
                    console.log("Deleted cluster " + clusterId + " due to time expiration.");
                }
            }
        };

        var mergeToOrCreateCluster = function(newTweet){
            console.log("mergeOrCreate called");
            for (let clusterId in Object.getOwnPropertyNames(moduleExports.clusters)){
                var cluster = moduleExports.clusters[clusterId];
                if(!cluster){
                    continue;
                }
                var dist = utils.haversineDistance(cluster.coordinates, newTweet.coordinates);
                if (dist < maxDistanceThreshold){
                    console.log("Merging tweet with cluster " + clusterId +"!");
                    moduleExports.clusters[clusterId] = merge(cluster, newTweet);
                    return moduleExports.clusters[clusterId];
                }
            }
            // if we didn't merge, create a new cluster
            var finalCluster = moduleExports.clusters[moduleExports.maxClusterId] = {
                tweets: [newTweet],
                coordinates: newTweet.coordinates,
                timestamp: newTweet.timestamp, // timestamp of last tweet in cluster
                isMob: false,
                clusterId: moduleExports.maxClusterId
            };
            console.log("Created new cluster " + moduleExports.maxClusterId);
            moduleExports.maxClusterId += 1;

            return finalCluster;
        };

        var observableStream = RxfromIO(stream, "data");

        observableStream
            .filter(tweet => tweet.coordinates != null && tweet.user)
        .do(clearOldClusters)
            .do(tweet => console.log("(mobDetect) Got geotagged tweet (" + tweet.text.replace("\n", " ") + ") (" + tweet.coordinates.coordinates +")!"))
        .map(tweet => (
        {
            id: tweet.id_str,
            text: tweet.text,
            user: tweet.user.screen_name,
            coordinates: tweet.coordinates.coordinates,
            timestamp: utils.getTimestamp(tweet.created_at)
        }))
        .map(mergeToOrCreateCluster)
            .subscribe(cluster => notifyClients(cluster, cluster.isMob ? "mob": "cluster"));


        stream.on('error', function (event) {
            onError(event);
        });
    };
    return moduleExports;
}

module.exports = MobDetection;