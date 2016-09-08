/*
 Module to access database provided by Project A
 */
var config = require('../cfg/config.json');
var request = require('request');
var SearchError = function (message, date, searchedName) {
    this.name = 'SearchError';
    this.message = message || 'Some Failure happened while searching for a SentimentAnalysis';
    this.stack = (new Error()).stack;
    this.date = date;
    this.character = searchedName;
};

SearchError.prototype = Object.create(Error.prototype);
SearchError.prototype.constructor = SearchError;

/*
 Saves a json to the character in the database
 json format:
 {
 "date" : "12.11.2016",    //Analyzed date
 "pos" : "12",    //positive sentiment sum
 "neg" : "43",  // negative sentiment sum
 "posT" : "6",   //number of positive tweets
 "negT" : "4",   // number of negative tweets
 "nullT" : "23"  // number of neutral tweets
 }
 */
exports.saveSentiment = function (charName, json) {
    var url = config.database.sentimentSave;
    var form = {
        form: {
            'character': charName,
            'date': json.date,
            'posSum': json.posSum,
            'negSum': json.negSum,
            'posCount': json.posCount,
            'negCount': json.negCount,
            'nullCount': json.nullCount,
            'description': json.description
        }
    };
    request.post(url, form, function (err, resp, body) {
        if (err) {
            console.error(err, body);
        }
    });
};
/*
 JSON that will be passed to the callback function is an array with the elements with these properties:
 {
 character: String,
 date     : DateString,		// in ISO Date format
 posSum   : Number,
 negSum   : Number,
 posCount : Number,
 negCount : Number,
 nullCount: Number,
 description: String    // To distinguish between data sources. E.g. Group 6, Group 7
 }
 */
exports.getSentimentForNameTimeframe = function (character, startDate, endDate, callback) {

    var url = config.database.sentimentGetChar;
    var startmil = (new Date(startDate)).getTime();
    var endmil = (new Date(endDate)).getTime();
    var form = {
        form: {
            'character': character
        }
    };
    request.post(url, form, function (err, response, body) {
        var error;
        if (err) {
            error = new SearchError('Error connecting to database');
            callback(undefined, error);
        } else {
            if (response.statusCode === 400) {
                error = new SearchError('Usage of invalid database schema', startDate, character);
                callback(undefined, error);
            }
            if (response.statusCode === 404) {
                error = new SearchError('No data for this character', startDate, character);
                callback(undefined, error);
            }
            if (response.statusCode === 200) {
                var json = JSON.parse(body);
                var data = json.data;
                json = data.filter(function (element) {
                    var date = new Date(element.date).getTime();
                    return (endmil >= date) && (startmil <= date) && (element.description === "Group 5");
                });
                if (json.length === 0) {
                    error = new SearchError('No results in database', startDate, character);
                    callback(undefined, error);
                } else {
                    callback(json);
                }
            }
        }
    });
};
/*
 Same result json as getSentimentForNameTimeframe
 */
exports.getSentimentTimeframe = function (startDate, endDate, callback) {

    var url = config.database.sentimentGetAll;
    url = url.replace('startdate', startDate);
    url = url.replace('enddate', endDate);

    request.get(url, function (err, resp, body) {
        var error;
        //check for valid response
        if (err) {
            error = new SearchError('Error connecting to database');
            callback(undefined, error);
        } else {
            if (resp.statusCode === 200) {
                //parse answer String to a JSON Object
                var json = JSON.parse(body);
                var data = json.data;
                json = data.filter(function (element) {
                    return element.description === "Group 5"; //only includes results from our group
                });
                //give JSON object to the callback function
                if (json.length === 0) {
                    error = new SearchError('No results in database', startDate);
                    callback(undefined, error);
                } else {
                    callback(json);
                }
            }
            if (resp.statusCode === 400) {
                error = new SearchError('Usage of invalid database schema', startDate);
                callback(undefined, error);
            }
            if (resp.statusCode === 404) {
                error = new SearchError('Invalid character or timeframe', startDate);
                callback(undefined, error);
            }
        }
    });
};
/*
 Provides Date Object for airDate of a specific episode
 */
exports.airDate = function (season, episode, callback) {
    //URL to the API provided by Project A
    var url = config.database.airDateURL;
    //Form includes the search criteria
    var form = {
        form: {
            'season': season,
            'nr': episode
        }
    };
    //Make POST request to API
    request.post(url, form, function (err, resp, body) {
        var error;
        if(err){
            error = new SearchError('Error connecting to database');
            callback(undefined, error);
        } else {
            if (resp.statusCode === 400) {
                error = new SearchError('Usage of invalid database schema');
                callback(undefined, error);
            }
            if (resp.statusCode === 404) {
                error = new SearchError('Invalid season / episode');
                callback(undefined, error);
            }
            if (resp.statusCode === 200) {
                //just get the airing date information
                var json = JSON.parse(body);
                var airDate = json.data[0].airDate; //dateString is in format: "2011-04-16T22:00:00.000Z"
                //make a Date object for the callback function to use
                callback(new Date(airDate));
            }
        }
    });
};

/*
 Callback function gets JSON with all character Names as parameter
 */
exports.characterNames = function (callback) {
    //URL to API by ProjectA
    var url = config.database.characterNamesURL;
    //GET request to API
    request.get(url, function (err, resp, body) {
        var error;
        //check for valid response
        if (err) {
            error = new SearchError('Error connecting to database');
            callback(undefined, error);
        }
        if (!err && resp.statusCode === 200) {
            //parse answer String to a JSON Object
            var json = JSON.parse(body);
            var formatted = []; //make it an array for easier iteration
            for (var i = 0; i < json.length; i++) {
                //only include the names
                formatted.push({
                    name: json[i].name
                });
            }
            //give JSON object to the callback function
            if (json.length === 0) {
                error = new SearchError('No results in database');
                callback(undefined, error);
            } else {
                callback(formatted);
            }
        }
    });
};