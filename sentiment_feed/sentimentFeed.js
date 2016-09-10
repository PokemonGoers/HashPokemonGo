var io = require('socket.io')(8888);
/*
  observedPokemon:
    Maps each pokemon name to its current sentiment and a list
    of ids of listeners who are subscribed to that pokemon
  listeners:
    Maps each listenerId to the listener object
*/
var observedPokemon = {};
var listeners = {};

io.of('/sentiment').on('connection', function (socket) {
    console.log("New connection for live sentiment!");
    listeners[socket.id] = {
      socket: socket,
      lat: socket.handshake.query.lat,
      lng: socket.handshake.query.lng,
      rad: socket.handshake.query.rad
    };
    console.log(listeners);
    // TODO: get nearby pokemon
    var nearbyPokemon = [];// = PokemonGoAPI.getPokemon(lat, lng, rad);

    for (p in nearbyPokemon) {
      if (observedPokemon[p.name] == undefined) {
        var newPokemon = {
          sentiment: 0,
          listenerIds: [newId]
        }
        observedPokemon[p.name] = newPokemon;
      } else {
        observedPokemon[p.name].listenerIds.push(newId);
      }
    }

});

exports.startSentimentFeed = function(stream) {
  stream.on('data', function(tweet) {
    // console.log("startSentimentFeed TWEET: ", tweet);
  });
}

