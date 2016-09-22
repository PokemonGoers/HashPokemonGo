// libs
var Rx = require("rxjs");
var MongoClient = require('mongodb').MongoClient;
var HashMap = require('HashMap');


/**
 * Get sentiments for a certain pokemon nearby (2000 meters) of a certain location of the last 30 days for a certain pokemon
 *
 * @param databaseUrl The database url
 * @param pokemonNumber The pokemon number (pokemon id)
 * @param successCallback function with one parameter where you will get the sentiments data (array) back
 * @param errorCallback function with one parameter where you will get the error back
 */
module.exports.sentimentsForPokemonByLocation = function (databaseUrl, pokemonNumber, lat, lng, successCallback, errorCallback) {

    MongoClient.connect(databaseUrl, function (err, db) {
        if (err) {
            console.log("Error while connecting to database. " + err);
            throw err;
        } else {

            db.collection('SentimentedTweets').createIndex({coordinates:"2dsphere"});

            var startDate = new Date();
            var endDate = new Date();
            endDate.setHours(0, 0, 0, 0);
            endDate.setDate(startDate.getDate() - 7); // Last 30 days

            queryTweetsForPokemon(db, {
                    "$and": [
                        {
                            "pokemonNumber": pokemonNumber
                        },
                        {
                            "createdAt": {'$gte': endDate}
                        },
                        {
                            "coordinates": {
                                "$near": {
                                    "$geometry": {
                                        "type": "Point",
                                        "coordinates": [lng, lat]
                                    },
                                    "$maxDistance": 2000
                                }
                            }
                        }
                    ]
                }
            )
                .flatMap(sentimentedTweets => Rx.Observable.from(sentimentedTweets)) // Emit every item one by one
                .reduce(toHashMap, new HashMap())
                .map(hashMap => hashMapToArray(hashMap, startDate, endDate))
                .subscribe(
                    data => successCallback(data),
                    error => {
                        errorCallback(error);
                        db.close();
                    },
                    () => db.close()
                )
            ;
        }
    });

};


/**
 * Get sentimens for the last 30 days for a certain pokemon
 * @param databaseUrl The database url
 * @param pokemonNumber The pokemon number (pokemon id)
 * @param successCallback function with one parameter where you will get the sentiments data (array) back
 * @param errorCallback function with one parameter where you will get the error back
 */
module.exports.setimentsForPokemon = function (databaseUrl, pokemonNumber, successCallback, errorCallback) {

    MongoClient.connect(databaseUrl, function (err, db) {
        if (err) {
            console.log("Error while connecting to database. " + err);
            throw err;
        } else {
            var startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            var endDate = new Date();
            endDate.setHours(0, 0, 0, 0);
            endDate.setDate(startDate.getDate() - 7); // Last 30 days

            queryTweetsForPokemon(db, {
                    $and: [
                        {
                            pokemonNumber: pokemonNumber
                        },
                        {
                            createdAt: {'$gte': endDate}
                        }
                    ]
                }
            )
                .flatMap(sentimentedTweets => Rx.Observable.from(sentimentedTweets)) // Emit every item one by one
                .reduce(toHashMap, new HashMap())
                .map(hashMap => hashMapToArray(hashMap, startDate, endDate))
                .subscribe(
                    data => successCallback(data),
                    error => {
                        errorCallback(error);
                        db.close();
                    },
                    () => db.close()
                )
            ;
        }
    });
};


/**
 * Query for Sentimented Tweets
 * @param db
 * @param selector
 * @return {*} Observable with an array of sentimented tweets
 */
function queryTweetsForPokemon(db, selector) {
    return Rx.Observable.fromPromise(db.collection('SentimentedTweets').find(selector).sort({"createdAt": 1}).toArray());
}


var toHashMap = function (hashMap, sentimentedTweet) {
    // Assumptions: sentimented tweets are sorted by number
    sentimentedTweet.createdAt.setHours(0, 0, 0, 0);
    var dateOnly = sentimentedTweet.createdAt;

    var entry = hashMap.get(dateOnly);
    if (!entry) {
        entry = {
            date: dateOnly,
            pos: 0,
            neg: 0
        };

        hashMap.set(dateOnly, entry);
    }

    var score = sentimentedTweet.sentimentScore;
    if (score > 0) {
        entry.pos += score;
    } else {
        entry.neg += score;
    }

    return hashMap;
};


/**
 * Converts a hashmap into an array by filling the array (between startDate end endDate) with neutral entries (positive = 0 and negative = 0) if no
 * sentimented tweet was available at the given day.
 * @param hashmap
 * @param startDate typically now
 * @param endDate typically now - 30 days.
 * @return {Array} Array of data for each day containing the (aggregated) positive and negative sentiment score
 */
function hashMapToArray(hashmap, startDate, endDate) {

    var array = new Array();

    while (endDate < startDate) {

        var entry = hashmap.get(endDate);
        if (!entry) {
            entry = {
                date: new Date(endDate),
                pos: 0,
                neg: 0
            };
        }
        array.push(entry);
        endDate.setDate(endDate.getDate() + 1); // next day for next loop iteration
    }

    return array;
};