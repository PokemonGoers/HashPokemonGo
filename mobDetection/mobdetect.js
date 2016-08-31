/**
 * Created by dowling on 28/08/16.
 */
var moment = require('moment');

/** Extend Number object with method to convert numeric degrees to radians */
//via http://www.movable-type.co.uk/scripts/latlong.html
if (Number.prototype.toRadians === undefined) {
    Number.prototype.toRadians = function() { return this * Math.PI / 180; };
}

// minimum number of close-by tweets in a cluster required for it to become a mob
mobSizeThreshold = 8;  // TODO figure out a reasonable minimum mob size

// maximum number of seconds that can pass between two tweets in a cluster before the cluster is deleted again
maxClusterAge = 5 * 60; // seconds

// max number of meters between two tweets for them to be in the same cluster
maxDistanceThreshold = 300;

var haversineDistance = function(coords1, coords2){
    // haversine distance function, gives number of meters between two points
    // via http://www.movable-type.co.uk/scripts/latlong.html

    var lon1 = coords1[0];
    var lat1 = coords1[1];

    var lon2 = coords2[0];
    var lat2 = coords2[1];

    var R = 6371e3; // metres
    var φ1 = lat1.toRadians();
    var φ2 = lat2.toRadians();
    var Δφ = (lat2-lat1).toRadians();
    var Δλ = (lon2-lon1).toRadians();

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

var merge = function (cluster, newTweet) {
    var numTweets = cluster.tweets.length;

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
    cluster.isMob = numTweets + 1 > mobSizeThreshold;

    return cluster;
};

var getTimestamp = function(createdAtStr){
    var timestamp = moment(createdAtStr, 'dd MMM DD HH:mm:ss ZZ YYYY', 'en');
    timestamp.utc();
    timestamp = parseInt(timestamp.format("X")); // unix timestamp (seconds)
    return timestamp;
};

exports.startPokeMobDetection = function (stream, onMob, onError) {
    var clusters = {};
    var maxClusterId = 0;

    stream.on('data', function(tweet) {
        // console.log(JSON.stringify(tweet));
        // we definitely need locations
        if (tweet.coordinates == null){
            return;
        }
        console.log("Got geotagged tweet (" + tweet.text + ") (" + tweet.coordinates.coordinates +")!");
        var now = Math.floor(Date.now() / 1000);

        // clear out expired clusters
        for (var clusterId in clusters) {
            if (clusters.hasOwnProperty(clusterId)) {
                if (now - clusters[clusterId].timestamp > maxClusterAge){
                    delete clusters[clusterId];
                    console.log("Deleted cluster " + clusterId + " due to time expiration.");
                }
            }
        }

        // simplify tweet format
        var newTweet = {
            id: tweet.id_str,
            text: tweet.text,
            coordinates: tweet.coordinates,
            timestamp: getTimestamp(tweet.created_at)
        };

        // see if the new tweet should be merged to any existing cluster TODO: if needed, speed up with a geo index
        for (clusterId in clusters){
            if (clusters.hasOwnProperty(clusterId)){
                var cluster = clusters[clusterId];
                var dist = haversineDistance(cluster.coordinates.coordinates, newTweet.coordinates.coordinates);
                if (dist < maxDistanceThreshold){
                    console.log("Merging tweet with cluster " + clusterId +"!");
                    cluster = merge(cluster, newTweet);  // TODO: we need to incorporate number of users (one person should not be a mob)
                    clusters[clusterId] = cluster;
                    if(cluster.isMob){ // TODO maybe only notify once, then notify on location change?
                        onMob(cluster);
                    }

                    return;
                }
            }
        }

        // if we didn't merge, create a new cluster
        clusters[maxClusterId] = {
            tweets: [newTweet],
            coordinates: newTweet.coordinates,
            timestamp: newTweet.timestamp, // timestamp of last tweet in cluster
            isMob: false
        };
        console.log("Created new cluster " + maxClusterId);

        // increment ID for next cluster
        maxClusterId += 1;
    });

    stream.on('error', function (event) {
        onError(event);
    });
};


