/**
 * Created by dowling on 27/08/16.
 */

module.exports = {
    helloWorld: function () {
        console.log("Hello world.")
    },
    mob: require("./mobDetection/mobdetect"),
    sentimentFeed: require("./sentiment_feed/sentimentFeed")
};

