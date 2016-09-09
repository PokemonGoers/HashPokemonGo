var db = require('../db/database');
var sentiment = require('sentiment');

/**
 * Calculates the sentiment analysis of an arrray of tweets and stores them into the database
 * @param pokemonName The pokemens name
 * @param tweets
 * @param startDate
 * @param endDate
 * @param save Should the result be saved into the database
 * @param callback
 */
exports.calculateSentimentsForTweets = function (pokemonName, tweets, startDate, endDate, save, callback) {

    // TODO what about location

    var sentimentJSON = {};
    var posSentiment = 0;
    var negSentiment = 0;
    var posTweets = 0;
    var negTweets = 0;
    var nullTweets = 0;

    for (var index in tweets) {
        var currentTweet = tweets[index];
        var sentimentScore = sentiment(currentTweet.text).score;

        if (sentimentScore > 0) {
            posSentiment += sentimentScore;
            posTweets += 1;
        } else if (sentimentScore < 0) {
            negSentiment += sentimentScore;
            negTweets += 1;
        } else {
            nullTweets += 1;
        }
    }

    sentimentJSON.date = endDate;
    sentimentJSON.posSum = posSentiment;
    sentimentJSON.negSum = (negSentiment * (-1));
    sentimentJSON.posCount = posTweets;
    sentimentJSON.negCount = negTweets;
    sentimentJSON.nullCount = nullTweets;
    sentimentJSON.description = "Group 5";
    if (save) {
        db.saveSentiment(pokemonName, sentimentJSON);
    } else {
        sentimentJSON.pokemon = pokemonName;
        callback(sentimentJSON);
    }
};