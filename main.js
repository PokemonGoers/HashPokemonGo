"use strict";
/**
 * Created by dowling on 27/08/16.
 */

require("../PokeData/constants");
var hashpokemongo = require("./hashpokemongo");
var PokemonTwitter = require("../PokeData/app/controllers/filler/twitter");
var twitterSentiments = require("./sentimentTwitter/twittersentiments");


var Twitter = require("twitter");
var options = {
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
};

var client = new Twitter(options);

twitterSentiments.startTweetsAnalysis(client, null);

var pokemonSearchTerms = 'caught #pokemongo,saw #pokemongo,found #pokemongo,appeared #pokemongo,attacked #pokemongo,pokemon catch,pokemon saw,pokemon attack,pokemon find,pokemon caught,pokemon attacked,pokemon found,pokemon appeared,#foundPokemon,#caughtPokemon,#pokemongo,a wild appeared until #pokemongo';
var pokemonNames = "bulbasaur, ivysaur, venusaur, charmander, charmeleon, charizard, squirtle, wartortle, blastoise, caterpie, metapod, butterfree, weedle, kakuna, beedrill, pidgey, pidgeotto, pidgeot, rattata, raticate, spearow, fearow, ekans, arbok, pikachu, raichu, sandshrew, sandslash, nidoran ♀, nidorina, nidoqueen, nidoran ♂, nidorino, nidoking, clefairy, clefable, vulpix, ninetales, jigglypuff, wigglytuff, zubat, golbat, oddish, gloom, vileplume, paras, parasect, venonat, venomoth, diglett, dugtrio, meowth, persian, psyduck, golduck, mankey, primeape, growlithe, arcanine, poliwag, poliwhirl, poliwrath, abra, kadabra, alakazam, machop, machoke, machamp, bellsprout, weepinbell, victreebel, tentacool, tentacruel, geodude, graveler, golem, ponyta, rapidash, slowpoke, slowbro, magnemite, magneton, farfetch'd, doduo, dodrio, seel, dewgong, grimer, muk, shellder, cloyster, gastly, haunter, gengar, onix, drowzee, hypno, krabby, kingler, voltorb, electrode, exeggcute, exeggutor, cubone, marowak, hitmonlee, hitmonchan, lickitung, koffing, weezing, rhyhorn, rhydon, chansey, tangela, kangaskhan, horsea, seadra, goldeen, seaking, staryu, starmie, mr. mime, scyther, jynx, electabuzz, magmar, pinsir, tauros, magikarp, gyarados, lapras, ditto, eevee, vaporeon, jolteon, flareon, porygon, omanyte, omastar, kabuto, kabutops, aerodactyl, snorlax, articuno, zapdos, moltres, dratini, dragonair, dragonite, mewtwo, mew";
var stream = client.stream('statuses/filter', {track: pokemonSearchTerms + "," + pokemonNames});

stream.on("data", function (data) {
    if (data.user) {
        console.log("Got tweet by '" + data.user.screen_name + "': " + data.text);
    }
});


hashpokemongo.helloWorld();
hashpokemongo.mob.startPokeMobDetection(stream, function (error){
    console.log(error);
});

hashpokemongo.sentimentFeed.startSentimentFeed(stream);
