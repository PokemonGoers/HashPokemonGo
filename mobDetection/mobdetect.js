"use strict";
/**
 * Created by dowling on 28/08/16.
 */

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
                var listener = listeners[i];
                if (listener.coordinates == "all" || utils.haversineDistance(listener.coordinates, cluster.coordinates) <= listener.radius) {
                    listener.socket.emit(channel, cluster);
                }
            }
        };

        stream.on('data', function(tweet) {
            // console.log(JSON.stringify(tweet));
            // we definitely need locations
            if (tweet.coordinates == null){
                return;
            }
            if (!tweet.user) {
                return;
            }

            var now = Math.floor(Date.now() / 1000);

            // clear out expired clusters
            for (var clusterId in moduleExports.clusters) {
                if (moduleExports.clusters.hasOwnProperty(clusterId)) {
                    if (now - moduleExports.clusters[clusterId].timestamp > maxClusterAge){
                        delete moduleExports.clusters[clusterId];
                        console.log("Deleted cluster " + clusterId + " due to time expiration.");
                    }
                }
            }

            var coordsFormatted = "" + tweet.coordinates.coordinates[1] + ", " + tweet.coordinates.coordinates[0];
            console.log("(mobDetect) Got geotagged tweet (" + tweet.text.replace("\n", " ") + ") (" + coordsFormatted +")!");

            // simplify tweet format
            var newTweet = {
                id: tweet.id_str,
                text: tweet.text,
                user: tweet.user.screen_name,
                coordinates: tweet.coordinates.coordinates,
                timestamp: utils.getTimestamp(tweet.created_at)
            };

            // see if the new tweet should be merged to any existing cluster TODO: if needed, speed up with a geo index
            for (clusterId in moduleExports.clusters){
                if (moduleExports.clusters.hasOwnProperty(clusterId)){
                    var cluster = moduleExports.clusters[clusterId];
                    var dist = utils.haversineDistance(cluster.coordinates, newTweet.coordinates);
                    if (dist < maxDistanceThreshold){
                        console.log("Merging tweet with cluster " + clusterId +"!");
                        cluster = merge(cluster, newTweet);  // TODO: we need to incorporate number of users (one person should not be a mob)
                        moduleExports.clusters[clusterId] = cluster;

                        notifyClients(moduleExports.clusters[clusterId], "cluster");
                        if(cluster.isMob){
                            notifyClients(moduleExports.clusters[moduleExports.maxClusterId], "mob");
                        }

                        return;
                    }
                }
            }

            // if we didn't merge, create a new cluster
            moduleExports.clusters[moduleExports.maxClusterId] = {
                tweets: [newTweet],
                coordinates: newTweet.coordinates,
                timestamp: newTweet.timestamp, // timestamp of last tweet in cluster
                isMob: false,
                clusterId: moduleExports.maxClusterId
            };
            //notifyClients(clusters[maxClusterId], "cluster");

            console.log("Created new cluster " + moduleExports.maxClusterId);

            // increment ID for next cluster
            moduleExports.maxClusterId += 1;
        });

        stream.on('error', function (event) {
            onError(event);
        });
    };
    return moduleExports;
}

module.exports = MobDetection;