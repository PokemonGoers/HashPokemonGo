// libs
var Rx = require("rxjs");
var sentiment = require("sentiment");


// Data
var pokemons = require('./pokemons');
var subscription = null;

/**
 * Periocially check for tweets on twitter and runs sentiment analysis on those tweets.
 * The value will then be saved into a database
 * @param twitterClient
 * @param databaseConfig
 */
module.exports.startTweetsAnalysis = function (twitterClient, databaseConfig) {

    subscription = Rx.Observable.interval(5 * 1000) // run every 18 seconds;  24 seconds for each pokemon to ensure each pokemon has been queried at least once per day
        .map(counter => pokemons[counter % 151]) // take the pokemon at index
        .do(pokemon => console.log("Searching tweets for " + pokemon.Name + " (" + pokemon.Number + ")")
        ).flatMap(pokemon => {
            // Search for tweets and  set lastTweetId to now
            var emptyArrayObservable = Rx.Observable.from([1]).map(ignored => []); // in case of an network error: return empty array  ... For some streange reason Observable.just() hasn't been found.

            return Rx.Observable.onErrorResumeNext(searchTweets(twitterClient, pokemon)
                    .do(tweets => {
                        if (tweets.length > 0)
                            pokemon.lastTweetId = tweets[0].id;
                    }),
                emptyArrayObservable);

        })
        .flatMap(tweets => Rx.Observable.from(tweets)) // Emits ever item from the tweets array one by one to the observable stream
        .filter(tweet => containsHashtag(tweet.entities.hashtags, ['pokemongo', 'pokemon', 'pokémon'])) // filter tweets containing given hashtags
        .map(tweet => toSentimentedTweet(tweet))
        .subscribe(next => console.log("onNext: sentiment: " + next.sentimentScore + " : " + next.text),
            error => console.log("onError: " + error));
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
        twitterClient.get('search/tweets', searchArguments, function (error, tweets, response) {

            if (error) {
                // Error
                observer.error("Error");

            } else {
                // Successful
                var statuses = tweets.statuses;
                var tweetArray = [];
                for (var index in statuses) {
                    var tweet = statuses[index];
                    tweetArray.push(tweet);
                }
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

    var i;
    var j;
    for (i = 0; i < hashtagsArray.length; i++) {
        for (j = 0; j < hashtagsToContain.length; j++) {
            if (hashtagsArray[i].text.toLowerCase() === hashtagsToContain[j])
                return true;
        }
    }

    return false;
}


/**
 * Runs sentiment analysis on a tweet and returns
 * @param tweet The original tweet
 * @return {id: *, text: string, sentimentScore: number, lat: float, lng: float} object representing a tweet with the sentiment score and tweet id, text, latitude and longitude
 */
function toSentimentedTweet(tweet) {

    var sentimentScore = sentiment(tweet.text).score;

    if (!tweet.coordinates) {
        return {id: tweet.id, text: tweet.text, sentimentScore: sentimentScore, lat: null, lng: null}
    } else {
        return {
            id: tweet.id,
            text: tweet.text,
            sentimentScore: sentimentScore,
            lat: tweet.coordinates[0].coordinates[1],
            lng: tweet.coordinates[0].coordinates[0]
        }
    }

}

/**
 * Stops the periodically tweets sentiment analysis
 */
module.exports.stopTweetsAnalysis = function () {
    if (subscription != null) {
        subscription.unsubscribe();
    }
};


