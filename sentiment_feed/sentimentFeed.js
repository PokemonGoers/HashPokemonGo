function SentimentFeed(options) {
    var moduleExports = {};
    var io = options.io || require('socket.io')(options.port || 8888);

    var sentiment = require("sentiment");
    var utils = require("../util/util");

    moduleExports.listeners = [];
    moduleExports.allPokemonNames = {};

    io.of('/sentiment').on('connection', function (socket) {
        socket.on("settings", function (settings) {
            console.log("New connection for live sentiment, for (" + settings.lat + ", " + settings.lon + "), " + settings.radius + " !");
            var coords = settings.mode == "all" ? "all" : [settings.lon, settings.lat];
            var listener = {
                socket: socket,
                coordinates: coords,
                radius: settings.radius || 1000,
                pokemonName: (settings.pokemonName == undefined) ? "all" : settings.pokemonName.toLowerCase()
            };
            moduleExports.listeners.push(listener);
            moduleExports.allPokemonNames[listener.pokemonName] = true; // value is insignificant, we just need a set
        });
    });

    moduleExports.startSentimentFeed = function (stream) {
        var notifyClients = function (tweet) {
            for (var i in moduleExports.listeners) {
                var listener = moduleExports.listeners[i];
                if (listener.coordinates == "all" || utils.haversineDistance(listener.coordinates, tweet.coordinates) <= listener.radius) {
                    if (listener.pokemonName == "all" || tweet.text.toLowerCase().indexOf(listener.pokemonName) != -1) {
                        listener.socket.emit("tweet", tweet);
                    }
                }
            }
        };

        stream.on('data', function (tweet) {
            // console.log(JSON.stringify(tweet));
            console.log(tweet.text);
            // we definitely need locations
            if (tweet.coordinates == null) {
                return;
            }
            if (!tweet.user) {
                return;
            }

            var coordsFormatted = "" + tweet.coordinates.coordinates[1] + ", " + tweet.coordinates.coordinates[0];
            console.log("(sentimentFeed) Got geotagged tweet (" + tweet.text.replace("\n", " ") + ") (" + coordsFormatted + ")!");

            // get sentiment score
            var sentim = sentiment(tweet.text);

            // simplify tweet format
            var newTweet = {
                id: tweet.id_str,
                text: tweet.text,
                user: tweet.user.screen_name,
                coordinates: tweet.coordinates.coordinates,
                timestamp: utils.getTimestamp(tweet.created_at),
                sentiment: {
                    score: sentim.score,
                    comparative: sentim.comparative
                }
            };
            notifyClients(newTweet);
        });
    };
    return moduleExports;
}


module.exports = SentimentFeed;