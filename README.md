# HashPokemonGo

[![Join the chat at https://gitter.im/pokemongoers/HashPokemonGo](https://badges.gitter.im/pokemongoers/HashPokemonGo.svg)](https://gitter.im/pokemongoers/HashPokemonGo?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Live sentiment analysis on pokemon in a x km radius - this can be easily implemented expanding on the work done last semester https://github.com/Rostlab/JS16_ProjectD_Group5 . We also want to know what people think about that Pokemon! So the user of the app should be able to visualize a live sentiment feed around his/her area (that is, given a lat/lng and a specific radius), and be able to see if people around him/her think positively or negatively about that pokemon. Additionally, since you will become the twitter experts, you will join forces with project A to realize the live-tweet miner.

===============================
## Usage

Serving:
```javascript
var client = require("twitter")({...});
var stream = client.stream('statuses/filter', {track: "pokemon"});
var io = require('socket.io')(3000);

var hashpokemongo = require("./hashpokemongo");

var mobOptions = {
    io: io,
    mobSizeThreshold: 5,
    maxClusterAge: 5 * 60,
    maxDistanceThreshold: 300
};

hashpokemongo.MobDetection(mobOptions).startPokeMobDetection(stream, function (error){
    console.log(error);
});

hashpokemongo.SentimentFeed({io: io}).startSentimentFeed(stream);
```

Client:
```javascript
// mob detection
var socket = io('http://localhost:3000/mobs');
socket.on('cluster', function (data) {
    console.log("New cluster: ", data);
});
socket.on('mob', function (data) {
    console.log("New mob! ", data);
});

// live sentiment analysis
var socket2 = io('http://localhost:3000/sentiment');
socket2.on("connect", function(){
    socket2.emit("settings",
            {
                mode: "geo", lat: 1, lon:1, radius: 50000000 //, pokemonName: "Abra", mode: "all"
            }
    );
});
```

===============================
## Setup / Running standalone demo

Ensure that mongodb server is running locally on your machine and that database with name `/test` is accessible (without authentication / password etc.)

Simply clone the repo, and run `npm install`. To run the server, use
```bash
CONSUMER_KEY=<your_consumer_key> CONSUMER_SECRET=<your_consumer_secret> ACCESS_TOKEN=<your_access_token> ACCESS_TOKEN_SECRET=<your_access_token_secret> npm start
```

A demo webapp is also provided: once the server is running, open `localhost:8080` in your browser for live sentiment analysis and cluster/mob detection, and provide an interface to query historic tweet sentiment for different pokemon.

Keep in mind that for the historic tweet sentiment analysis the server will query for tweets periodically. So you may want to run the server for some minutes so that some data has been mined.
