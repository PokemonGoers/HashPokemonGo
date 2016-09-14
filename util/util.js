/**
 * Created by dowling on 12/09/16.
 */
var moment = require('moment');
//via http://www.movable-type.co.uk/scripts/latlong.html
var toRadians = function (num) {
    return num * Math.PI / 180;
};
var haversineDistance = function(coords1, coords2){
    // haversine distance function, gives number of meters between two points
    // via http://www.movable-type.co.uk/scripts/latlong.html

    var lon1 = coords1[0];
    var lat1 = coords1[1];

    var lon2 = coords2[0];
    var lat2 = coords2[1];

    var R = 6371e3; // metres
    var φ1 = toRadians(lat1);
    var φ2 = toRadians(lat2);
    var Δφ = toRadians(lat2-lat1);
    var Δλ = toRadians(lon2-lon1);

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};


var getTimestamp = function(createdAtStr){
    var timestamp = moment(createdAtStr, 'dd MMM DD HH:mm:ss ZZ YYYY', 'en');
    timestamp.utc();
    timestamp = parseInt(timestamp.format("X")); // unix timestamp (seconds)
    return timestamp;
};

module.exports = {
    getTimestamp: getTimestamp,
    haversineDistance: haversineDistance,
    toRadians: toRadians
};