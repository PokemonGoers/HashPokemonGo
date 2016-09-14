/**
 * Created by dowling on 27/08/16.
 */

module.exports = {
    helloWorld: function () {
        console.log("Hello world.")
    },
    MobDetection: require("./mobDetection/mobdetect"),
    SentimentFeed: require("./sentiment_feed/sentimentFeed")
};

