var names = require('../popChars/popChars.json');
var twitter = require('./twitterApi');
var config = require('../cfg/config.json');
var intervalID,
    started = false;


/*
 Runs REST analysis for characters in popChars.json for the last day.
 Function is executed approx once per day per character
 */

exports.startAutomation = function () {
    if (!started) {
        started = true;
        var interval = config.automation.minutes * 60 * 1000;
        var currentPos = 0;
        intervalID = setInterval(function () {
            var currentDate = new Date();
            var startDate = new Date();
            var msToGoBack = names.length * config.automation.minutes * 60 * 1000;
            startDate.setTime(currentDate.getTime() - msToGoBack);
            twitter.getRest(names[currentPos].name, startDate.toISOString(), currentDate.toISOString(), true);
            currentPos = (currentPos + 1) % names.length;
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