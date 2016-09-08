var db = require('../db/database');
var sentiment = require('sentiment');
/*
 Calculates the Sentiment score for an array of tweets and saves to databse
 */
exports.calculateSentimentsForTweets = function (characterName, tweets, startDate, endDate, isSaved, callback) {
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
    if (isSaved) {
        db.saveSentiment(characterName, sentimentJSON);
    } else {
        sentimentJSON.character = characterName;
        callback(sentimentJSON);
    }
};