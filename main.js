"use strict";
/**
 * Created by dowling on 27/08/16.
 */

require("../PokeData/constants");
var Twitter = require('twitter');
var hashpokemongo = require("./hashpokemongo");
var twitterCredentials = require("./config/twitter.json");
var PokemonTwitter = require("../PokeData/app/controllers/filler/twitter");



// var params = {track: 'pokemon,pikachu,charmander,pokemongo,squirtle,bulbasaur'};  // TODO create better filter for pokemon go tweets (will probably get from project A anyway)
var stream = PokemonTwitter.getPokemonTwitterStream();


hashpokemongo.helloWorld();

stream.on("data", function (data) {
    if (data.user) {
        var toLog = "got tweet by '" + data.user.screen_name + "': " + data.text;
        console.log(toLog.replace("\n", ""), data.retweeted);
    }
});

hashpokemongo.mob.startPokeMobDetection(stream, function (mob) {
    // TODO notify frontend of new mob
    console.log(mob);
}, function (error) {
    console.log(error);
});
