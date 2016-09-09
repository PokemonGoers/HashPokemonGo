var util = require('util');
var twitter = require('twitter');
var sentiments = require('./sentiments');
var config = require('../config/twitterSample.json');
var apiAccess = {
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token_key: config.access_token_key,
    access_token_secret: config.access_token_secret
};

var client = new twitter(apiAccess);

var SearchError = function (message, date, searchedName) {
    this.name = 'SearchError';
    this.message = message || 'Some Failure happened while searching for a SentimentAnalysis';
    this.stack = (new Error()).stack;
    this.date = date;
    this.pokemon = searchedName;
};

SearchError.prototype = Object.create(Error.prototype);
SearchError.prototype.constructor = SearchError;
//launch Streaming-API search
//timeFrame in seconds
exports.getStream = function (characterName, duration, isSaved, callback) {
    var tweetArray = [];
    var currentDate = getCurrentDateAsString();
    var trimmedCharacterName = removeParentheses(characterName);

    client.stream('statuses/filter', {track: trimmedCharacterName}, function (stream) {
        stream.on('data', function (tweet) {
            tweetArray.push(tweet);
        });
        stream.on('error', function () {
            var streamError = new SearchError('Error connecting to Twitter. Check connection and request limit!');
            callback(undefined, streamError);
            stream.destroy();
        });
        setTimeout(function () {
            if (tweetArray.length === 0) {
                var error = new SearchError('No tweets recorded', new Date().toISOString(), characterName);
                callback(undefined, error);
            } else {
                runSentimentAnalysis(tweetArray, characterName, currentDate, currentDate, isSaved, callback);
            }
            stream.destroy();
        }, duration * 1000);
    });

};

//launch Rest-API search
//startDate, endDate in format "yyyy-mm-dd"
exports.getRest = function (pokemonName, startDate, endDate, isSaved, callback) {
    var searchArguments = getRestSearchArguments(pokemonName, startDate, endDate);
    client.get('search/tweets', searchArguments, function (error, tweets, response) {
        var statuses = tweets.statuses;
        var tweetArray = [];
        for (var index in statuses) {
            var tweet = statuses[index];
            tweetArray.push(tweet);
        }
        var filteredTweets = filterTweetsByHashtags(tweetArray, pokemonName);
        runSentimentAnalysis(filteredTweets, pokemonName, startDate, endDate, isSaved, callback);
    });
};

/**
 * Execute sentiment analysis on Tweets
 * @param tweetArray The tweets
 * @param pokemonName The name of the pokemon
 * @param startDate
 * @param endDate
 * @param isSaved
 * @param callback
 */
function runSentimentAnalysis(tweetArray, pokemonName, startDate, endDate, isSaved, callback) {
    var jsonTweets = getJSONTweetArray(tweetArray, pokemonName);
    sentiments.calculateSentimentsForTweets(pokemonName, jsonTweets, startDate, endDate, isSaved, callback);
}

function getJSONTweetArray(tweetArray, characterName) {
    var JSONArray = [];
    for (var tweet in tweetArray) {
        JSONArray.push(getTweetAsJSON(tweetArray[tweet], characterName));
    }
    return JSONArray;
}

function getTweetAsJSON(tweet, characterName) {
    var jsonTweet = {};
    jsonTweet.created_at = tweet.created_at;
    jsonTweet.text = tweet.text;
    jsonTweet.retweeted = tweet.retweet_count;
    jsonTweet.fav = tweet.favorite_count;
    return jsonTweet;
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
 * Converts the current date into a String representation
 * @returns {string}
 */
function getCurrentDateAsString() {
    var currentDate = new Date();
    var currentMonth = currentDate.getMonth() + 1;
    if (currentMonth < 10) {
        currentMonth = "0" + currentMonth;
    }
    var dateString = currentDate.getFullYear() + "-" + currentMonth + "-" + currentDate.getDate();
    return dateString;
}

/**
 * Filters only tweets containing pokemongo hashtag
 * @param tweets
 * @param pokemonName
 * @returns {*}
 */
function filterTweetsByHashtags(tweets, pokemonName) {
    var filteredTweets = [];
    if (pokemonName.indexOf(' ') > -1) {
        return tweets;
    } else {
        for (var index in tweets) {
            var hashtags = [];
            var hashtagArray = tweets[index].entities.hashtags;
            for (var i in hashtagArray) {
                var hashtag = hashtagArray[i].text.toLocaleLowerCase();
                hashtags.push(hashtag);
            }
            if (hashtags.indexOf("pokemongo") > -1) {
                filteredTweets.push(tweets[index]);
            } else {
                for (var j in hashtags) {
                    if (hashtags[j].indexOf("pokemon") > -1 || hashtags[j].indexOf("pokémon") > -1) {
                        filteredTweets.push((tweets[index]));
                        break;
                    }
                }
            }

        }
    }
    return filteredTweets;
}