/**
 * Created by dowling on 27/08/16.
 */

var Twitter = require('twitter');
var hashpokemongo = require("./hashpokemongo");
var twitterCredentials = require("./config/twitter.json");
var client = new Twitter(twitterCredentials);

var params = {track: 'pokemon'};  // TODO create better filter for pokemon go tweets (will probably get from project A anyway)
var stream = client.stream('statuses/filter', params);


hashpokemongo.helloWorld();
hashpokemongo.mob.startPokeMobDetection(stream, function (mob) {
    // TODO notify frontend of new mob
    console.log(mob);
}, function (error) {
    console.log(error);
});
