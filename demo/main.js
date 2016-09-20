// Registering a listener for all mobs / clusters
var socket = io('http://localhost:3000/mobs');
socket.on('connect', function () {
    console.log("Connected to server, sending settings for listening to all clusters..");
    socket.emit("settings", {mode: "all"});
});

socket.on('mob', function (data) {
    console.log("Mob spotted!", data);

});

socket.on('cluster', function (data) {
    console.log("New cluster: ", data);
    $(".mob").prepend("<div class='wordwrap'>" + JSON.stringify(data) + "</div>");
    //$(".mob").append('<input type="text" name="..." value="" readonly><br>');

});

// Registering a listener for some "local" mobs / clusters
var socket2 = io('http://localhost:3000/mobs');
socket2.on("connect", function () {
    console.log("Connected to server, sending geo settings..");
    socket2.emit("settings", {mode: "geo", lat: 1, lon: 1, radius: 5000000});
});

socket2.on('mob', function (data) {
    console.log("Geo Mob spotted!", data);
});

socket2.on('cluster', function (data) {
    console.log("New geo cluster: ", data);
});


// Registering a listener for live sentiment scores, same idea.
var socket3 = io('http://localhost:3000/sentiment');
socket3.on("connect", function () {
    socket3.emit("settings",
            {
                mode: "geo", lat: 1, lon: 1, radius: 50000000 //, pokemonName: "Abra", mode: "all"
            }
    );
});

socket3.on("tweet", function (data) {
    console.log(data);
    //$(".livetweet").append('<input type="text" name="..." value="'+ JSON.stringify(data) + '" readonly><br>');
    $(".livetweet").prepend("<div class='wordwrap'>" + JSON.stringify(data) + "</div>");
});


var options = {
    scaleBeginAtZero: false,
    responsive: true
};

function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}

var myBarChart = null;


var fillChart = function (response) {
    console.log(response);

    var labels = [];
    var positives = [];
    var negatives = [];
    for (var i = 0; i < response.length; i++) {
        var day = response[i];
        var date = new Date(day.date);
        labels.push(date.getMonth() + "/" + date.getDay());
        positives.push(day.pos);
        negatives.push(day.neg)
    }

    // sample chart
    var data = {
        labels: labels,
        datasets: [
            {
                label: "Positive sentiments",
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: positives
            },
            {
                label: "Negative sentiments",
                fillColor: "rgba(151,187,205,0.5)",
                strokeColor: "rgba(151,187,205,0.8)",
                highlightFill: "rgba(151,187,205,0.75)",
                highlightStroke: "rgba(151,187,205,1)",
                data: negatives
            }
        ]
    };

    if (myBarChart != null) {
        myBarChart.destroy();
    }

    var ctx = document.getElementById("myChart").getContext("2d");
    myBarChart = new Chart(ctx).Bar(data, options);

};

$("#go").click(function (event) {
    var pokenumber = $("#pokemonNumber").val();
    console.log("Pokenumber " + pokenumber);
    if (pokenumber === "") {
        window.alert("Please enter a pokenumber like 025 for Pikatchu");
    } else {
        var lat = $("#lat").val();
        var lng = $("#lng").val();

        if (lat !== "" && lng !== "") {
            // do request
            $.ajax({
                method: "GET",
                url: "/sentiments/" + pokenumber + "/" + lat + "/" + lng
            }).done(fillChart);

        } else {

            $.ajax({
                method: "GET",
                url: "localhost:8080/sentiments/" + pokenumber
            }).done(fillChart);
        }
    }
});