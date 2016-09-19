var Rx = require("rxjs");

function RxfromIO (io, eventName) {
    return Rx.Observable.create(observer => {
        io.on(eventName, (data) => {
            observer.next(data)
        });
        return {
            dispose: io.close
        }
    });
}

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

        var observableStream = RxfromIO(stream, "data");

        observableStream
            .filter(tweet => tweet.coordinates != null && tweet.user)
            .do(tweet => console.log("(sentimentFeed) Got geotagged tweet (" + tweet.text.replace("\n", " ") + ") (" + tweet.coordinates.coordinates + ")!"))
            .map(tweet => ({
                id: tweet.id_str,
                text: tweet.text,
                user: tweet.user.screen_name,
                coordinates: tweet.coordinates.coordinates,
                timestamp: utils.getTimestamp(tweet.created_at),
                sentiment: sentiment(tweet.text)
            }))
            .subscribe(newTweet => notifyClients(newTweet));
    };
    return moduleExports;
}


module.exports = SentimentFeed;