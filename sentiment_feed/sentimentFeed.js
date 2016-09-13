var io = require('socket.io')(8888);
var sentiment = require("sentiment");
var utils = require("../util/util");
/*
  observedPokemon:
    Maps each pokemon name to its current sentiment and a list
    of ids of listeners who are subscribed to that pokemon
  listeners:
    Maps each listenerId to the listener object
*/

var listeners = [];
var allPokemonNames = {};

io.of('/sentiment').on('connection', function (socket) {
    socket.on("settings", function(settings){
        console.log("New connection for live sentiment, for (" + settings.lat +", " + settings.lon + "), " + settings.radius+" !");
        var coords = settings.mode == "all"? "all": [settings.lon, settings.lat];
        var listener = {
            socket: socket,
            coordinates: coords,
            radius: settings.radius || 1000,
            pokemonName: settings.pokemonName || "all"
        };
        listeners.push(listener);
        allPokemonNames[listener.pokemonName] = true; // value is insignificant, we just need a set
    });
});

exports.startSentimentFeed = function(stream) {
    var notifyClients = function(tweet){
        for (var i in listeners){
            var listener = listeners[i];
            if (listener.coordinates == "all" || utils.haversineDistance(listener.coordinates, tweet.coordinates) <= listener.radius) {
                if (listener.pokemonName == "all" || tweet.text.indexOf(listener.pokemonName) != -1){
                    listener.socket.emit("tweet", tweet);
                }
            }
        }
    };

    stream.on('data', function(tweet) {
        // console.log(JSON.stringify(tweet));
        // we definitely need locations
        if (tweet.coordinates == null){
            return;
        }
        if (!tweet.user) {
            return;
        }

        var now = Math.floor(Date.now() / 1000);

        var coordsFormatted = "" + tweet.coordinates.coordinates[1] + ", " + tweet.coordinates.coordinates[0];
        console.log("(sentimentFeed) Got geotagged tweet (" + tweet.text.replace("\n", " ") + ") (" + coordsFormatted +")!");

        // get sentiment score
        var sentim = sentiment(tweet.text);

        // simplify tweet format
        var newTweet = {
            id: tweet.id_str,
            text: tweet.text,
            user: tweet.user.screen_name,
            coordinates: tweet.coordinates.coordinates,
            timestamp: utils.getTimestamp(tweet.created_at),
            sentiment: sentim
        };
        notifyClients(newTweet);
    });
};

