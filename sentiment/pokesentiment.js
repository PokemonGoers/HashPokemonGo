var pokemons = require('../data/pokemons.js');
var twitter = require('./twitterApi');
var config = require('../config/twitterSample.json');
var intervalID,
    started = false;


/**
 * check periodically for tweets about pokemons. This
 */
exports.startAutomation = function () {
    if (!started) {
        started = true;
        var interval = config.automation.minutes * 60 * 1000;
        var currentPos = 0;
        intervalID = setInterval(function () {
            var currentDate = new Date();
            var startDate = new Date();
            var msToGoBack = pokemons.length * config.automation.minutes * 60 * 1000;
            startDate.setTime(currentDate.getTime() - msToGoBack);
            twitter.getRest(pokemons[currentPos], startDate.toISOString(), currentDate.toISOString(), true);
            currentPos = (currentPos + 1) % pokemons.length;
        }, interval); // interval is set here
    } else {
        throw Error('Tried to start the Automationprocess a second time!');
    }
};

exports.stopAutomation = function () {
    if (started) {
        started = false;
        clearInterval(intervalID);
    } else {
        throw Error('Tried to stop the Automationprocess a second time!');
    }
};