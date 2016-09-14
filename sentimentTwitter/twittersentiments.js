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

    subscription = Rx.Observable.interval(1 * 1000) // run every 18 seconds;  24 seconds for each pokemon to ensure each pokemon has been queried at least once per day
        .map(counter => pokemons[counter % 151]) // take the pokemon at index
        .do(pokemon => console.log("Searching tweets for " + pokemon.Name + " (" + pokemon.Number + ")")
        ).flatMap(pokemon => {
            // Search for tweets and  set lastTwitterSearch to now
            var rightNow = new Date();
            return searchTweets(twitterClient, pokemon, rightNow);
                // .do(tweets => pokemon.lastTwitterSearch = rightNow);
        })
        .onErrorResumeNext(error => {
            console.log("An unexpected error has occurred " + error);
            return Observable.just(null); // Error handling: Do nothing but catch error to not interrupt the error loop
        })
        .subscribe();
};


/**
 * Search for tweets for a certain pokemon
 *
 * @param twitterClient the twitter client
 * @param pokemon The pokemon we want to search tweets for
 * @param rightNow Date representing now
 * @returns Observable with array of tweets
 */
function searchTweets(twitterClient, pokemon, rightNow) {
    // Create an observable
    return Rx.Observable.create(observer => {

        var searchArguments = createSearchArguments(pokemon.Name, pokemon.lastTwitterSearch, rightNow);
        twitterClient.get('search/tweets', searchArguments, function (error, tweets, response) {

            if (error) {
                // Error
                observer.error(error[0]);

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
 * Builds the arguments for a twitter search query
 * @param pokemon The nme of the pokemon
 * @param startDate
 * @param endDate
 * @returns {{q: *, result_type: string, since: *, until: *, lang: string, count: number}}
 */
function createSearchArguments(pokemon, start, endDate) {
    var startDate;
    if (!start) {
        var now = new Date();
        startDate = new Date(now.getMilliseconds() - 24 * 60 * 60 * 1000); // 1 Day before now
    } else {
        startDate = start;
    }
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


