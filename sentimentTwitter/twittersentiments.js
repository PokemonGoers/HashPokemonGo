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

    subscription = Rx.Observable.interval(18 * 1000) // run every 18 seconds;  24 seconds for each pokemon to ensure each pokemon has been queried at least once per day
        .map(counter => pokemons[counter % 151]) // take the pokemon at index
        .doOnError(error => console.log("An unexpected error has occured " + error)) // Log error
        .onErrorResumeNext(error => Observable.just(null)) // Error handling: Do nothing but catch error to not interrupt the error loop
        .subscribe();
};


function searchTweets(twitterClient, pokemon, now) {
    var searchArguments = getRestSearchArguments(pokemon.Name, pokemon.lastTwitterSearch, now);
    client.get('search/tweets', searchArguments, function (error, tweets, response) {
        var statuses = tweets.statuses;
        var tweetArray = [];
        for (var index in statuses) {
            var tweet = statuses[index];
            tweetArray.push(tweet);
        }
        var filteredTweets = filterTweetsByHashtags(tweetArray, pokemon.Name);
        runSentimentAnalysis(filteredTweets, pokemon, startDate, endDate, isSaved, callback);
    });
}


/**
 * Builds the arguments for a twitter search query
 * @param pokemon The nme of the pokemon
 * @param startDate
 * @param endDate
 * @returns {{q: *, result_type: string, since: *, until: *, lang: string, count: number}}
 */
function getRestSearchArguments(pokemon, startDate, endDate) {
    return {q: pokemon, result_type: 'mixed', since: startDate, until: endDate, lang: 'en', count: 100};
}


/**
 * Stops the periodically twitter anlysis check
 */
module.exports.stopTweetsAnalysis = function () {
    if (subscription != null) {
        subscription.unsubscribe();
    }
};


