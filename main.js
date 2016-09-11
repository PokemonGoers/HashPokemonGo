"use strict";
/**
 * Created by dowling on 27/08/16.
 */

require("../PokeData/constants");
var hashpokemongo = require("./hashpokemongo");
var PokemonTwitter = require("../PokeData/app/controllers/filler/twitter");



// var params = {track: 'pokemon,pikachu,charmander,pokemongo,squirtle,bulbasaur'};  // TODO create better filter for pokemon go tweets (will probably get from project A anyway)
var stream = PokemonTwitter.getPokemonTwitterStream();


hashpokemongo.helloWorld();

stream.on("data", function (data) {
    if (data.user) {
        var toLog = "got tweet by '" + data.user.screen_name + "': " + data.text.replace("\n", " ");
        console.log(toLog.replace("\n", ""), data.retweeted);
    }
});

hashpokemongo.mob.startPokeMobDetection(stream, function (error){
    console.log(error);
});

hashpokemongo.sentimentFeed.startSentimentFeed(stream);