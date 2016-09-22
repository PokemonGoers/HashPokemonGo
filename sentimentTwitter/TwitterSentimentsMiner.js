// libs
var Rx = require("rxjs");
var sentiment = require("sentiment");
var MongoClient = require('mongodb').MongoClient;


// Data
var pokemons = require('./pokemons');
var subscription = null;
var database = null;
var logging = false;
/**
 * Periocially check for tweets on twitter and runs sentiment analysis on those tweets.
 * The value will then be saved into a database
 * @param twitterClient The preconfigured twitter client
 * @param databaseUrl The url to the database
 * @param mineEveryMilliSeconds The number of seconds to wait before continue to mine the next pokement
 * @param log true or false if you want to do some command line logging
 */
module.exports.start = function (twitterClient, databaseUrl, mineEveryMilliSeconds, log) {
    logging = log;
    MongoClient.connect(databaseUrl, function (err, db) {
        if (err) {
            if (logging) console.log("HashMiner: Error while connecting to database. " + err);
            throw err;
        } else {
            if (logging) console.log("HashMiner: Connected correctly to database.");
            /* db.collection('SentimentedTweets').createIndex({"coordinates": "2dsphere"});
             db.collection('SentimentedTweets').createIndex({"pokemonNumber": 1});
             */
            database = db;


            subscription = Rx.Observable.interval(mineEveryMilliSeconds) // run 2 minutes a pokemon sentiment analysis
                .map(counter => pokemons[counter % pokemons.length]) // take the pokemon at index
                .do(pokemon => {
                    if (logging) console.log("HashMiner: TweetSentimentsMiner: Searching tweets for " + pokemon.Name + " (" + pokemon.Number + ")")
                })
                .flatMap(pokemon => getLastTweetAboutPokemonFromDatabase(pokemon))
                .flatMap(pokemon => {
                    // Search for tweets and  set lastTweetId to now
                    var emptyArrayObservable = Rx.Observable.from([1]).map(ignored => []); // in case of an network error: return empty array  ... For some streange reason Observable.just() hasn't been found.
                    return Rx.Observable.onErrorResumeNext(searchTweets(twitterClient, pokemon), emptyArrayObservable);

                })
                .flatMap(tweets => Rx.Observable.from(tweets)) // Emits ever item from the tweets array one by one to the observable stream
                .filter(tweet => containsHashtag(tweet.entities.hashtags, ['pokemongo', 'pokemon', 'pokémon'])) // filter tweets containing given hashtags
                .map(tweet => toSentimentedTweet(tweet)) // Run sentiment anlysis on each Tweet
                .filter(sentimetedTweet => sentimetedTweet.sentimentScore != 0) // Only take sentiments with more than 0
                .flatMap(sentimetedTweet => saveToDatabase(sentimetedTweet)) // Save sentimented tweets into database
                .retry()
                .subscribe(next => {
                        if (logging) console.log("HashMiner: saved sentiment: " + JSON.stringify(next))
                    },
                    error => {
                        if (logging) {
                            console.log("HashMiner: onError: " + error);
                            console.log(error.stack);
                        }
                    });
        }
    });
};


/**
 * Search for tweets for a certain pokemon
 *
 * @param twitterClient the twitter client
 * @param pokemon The pokemon we want to search tweets for
 * @returns Observable with array of tweets
 */
function searchTweets(twitterClient, pokemon) {
    // Create an observable
    return Rx.Observable.create(observer => {

        var searchArguments = {
            q: pokemon.Name,
            result_type: 'mixed',
            since_id: pokemon.lastTweetId,
            lang: 'en',
            count: 100
        };

        // if (logging) console.log("HashMiner: " + JSON.stringify(searchArguments));

        twitterClient.get('search/tweets', searchArguments, function (error, tweets, response) {

            if (error) {
                // Error
                observer.error("Error");
                if (logging) console.log("HashMiner: Twitter response error");

            } else {
                // Successful
                var statuses = tweets.statuses;
                var tweetArray = [];
                for (var index in statuses) {
                    var tweet = statuses[index];
                    if (pokemon.lastTweetId != null && tweet.id === pokemon.lastTweetId) {
                        continue; // Last element in the list is tweet with the id from since_id. Therefore skip that one as it is already in the database
                    }
                    tweet.pokemonNumber = pokemon.Number;
                    tweetArray.push(tweet);
                }
                // if (logging) console.log("HashMiner: Twitter response received");
                observer.next(tweetArray);
                observer.complete();
            }
        });

    });
}


/**
 * Searches a given array of hashtags for a hashtags (in lower case)
 * @param hashtagsArray The array of hashtags
 * @param hashtagsToContain the hashtags at least one of them must be contained in the first parameter
 * @returns {boolean}
 */
function containsHashtag(hashtagsArray, hashtagsToContain) {
    if (hashtagsArray.length == 0) {
        return false;
    }

    for (var i = 0; i < hashtagsArray.length; i++) {
        for (var j = 0; j < hashtagsToContain.length; j++) {
            if (hashtagsArray[i].text.toLowerCase() === hashtagsToContain[j])
                return true;
        }
    }

    return false;
}
/**
 * Get the last tweet of a certain pokemon from database. This must be done to get the last tweet id so that we can continue searching for
 * newer tweets
 * @param pokemon the Pokemon
 * @return {*} Observable of pokemon
 */
function getLastTweetAboutPokemonFromDatabase(pokemon) {
    return Rx.Observable.create(observer => {

        var cursor = database.collection('SentimentedTweets').find({"pokemonNumber": pokemon.Number}).sort({"createdAt": -1}).limit(1);
        cursor.count().then(function (size) {
            if (size == 0) {
                pokemon.lastTweetId = null;
                observer.next(pokemon);
                if (logging) console.log("HashMiner: no last sentimented tweet found (Maybe running first time)");
            } else {
                cursor.forEach(function (doc, err) {
                    if (err == null) {
                        if (doc != null) {
                            pokemon.lastTweetId = doc.twitterId;
                        } else {
                            pokemon.lastTweetId = null; // This case should already be covered with cursor.count() == 0 above
                        }

                        // if (logging) console.log("HashMiner: last tweet is: " + pokemon.lastTweetId);
                        observer.next(pokemon);
                        observer.complete();
                    } else {
                        observer.error(err);
                        if (logging) {
                            console.log("HashMiner: error while getting last tweet from dattabase: " + error);
                            console.log(error);
                        }
                    }
                });
            }
        }, function (error) {
            observer.error(err);
            if (logging) {
                console.log("HashMiner: DATABASE error while getting last tweet from database : " + error);
                console.log(error);
            }
        });

    });
}


/**
 * Runs sentiment analysis on a tweet and returns
 * @param tweet The original tweet
 * @return {id: *, text: string, sentimentScore: number, coordinates} object representing a tweet with the sentiment score and tweet id, text, latitude and longitude
 */
function toSentimentedTweet(tweet) {

    var sentimentScore = sentiment(tweet.text).score;

    return {
        twitterId: tweet.id,
        //  text: tweet.text // we dont need the tweet text
        pokemonNumber: tweet.pokemonNumber,
        createdAt: new Date(tweet.created_at),
        sentimentScore: sentimentScore,
        coordinates: tweet.coordinates
    }
}

/**
 * Saves the sentimented Tweet into the database
 * @param sentimentedTweet
 * @param collectionName
 * @return Observable returning sentimeted tweet if it has been saved successfully
 */
function saveToDatabase(sentimentedTweet) {

    return Rx.Observable.create(observer => {

        database.collection('SentimentedTweets').insertOne(sentimentedTweet, function (err2, db) {
            if (err2 == null) {
                // if (logging) console.log("HashMiner: saved sentimented Tweet to database");
                observer.next(sentimentedTweet);
                observer.complete();
            } else {
                if (logging) console.log("HashMiner: error saving sentimented Tweet to database");
                observer.error(err2);
            }
        });
    });
}

/**
 * Stops the periodically tweets sentiment analysis
 */
module.exports.stop = function () {
    if (subscription != null) {
        subscription.unsubscribe();
    }

    if (database != null) {
        database.close();
    }
};


