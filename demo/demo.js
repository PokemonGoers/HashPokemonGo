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
    //$(".mob").prepend("<div class='data wordwrap'>" + JSON.stringify(data) + "</div>");
    //$(".mob").append('<input type="text" name="..." value="" readonly><br>');
    var type = (data.isMob)? "(MOB!)" : "";
    var tweetList = "";
    for (let i = 0; i < data.tweets.length; ++i) {
        tweetList += "<div class='mob-tweet'>" +
                        "<div class='user-name'>" + data.tweets[i].user + "</div>" + 
                        "<div class='tweet-text'>" + data.tweets[i].text + "</div>" +
                    "</div>";
    }

    $(".mob").prepend(
        "<div class='data wordwrap'>" +
          "<div class='cluster-size'>Size: " + data.tweets.length + "</div>" +
          "<div class='cluster-id'>Cluster ID: " + data.clusterId + " " + type + "</div>" +
          "<div class='coordinates'>coordinates: (" + data.coordinates[0] + ", " + data.coordinates[1] + ")</div>" +
          "<div class='mob-tweet-container'>" + tweetList + "</div>" +
        "</div>"
    );
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
    socket3.emit("settings", {
        mode: "geo", lat: 1, lon: 1, radius: 50000000 //, pokemonName: "Abra", mode: "all"
    });
});

socket3.on("tweet", function (data) {
    // console.log(data);
    var scoreColor;
    if (parseInt(data.sentiment.score) > 0) {
        scoreColor = "green";
    } else if (parseInt(data.sentiment.score) < 0) {
        scoreColor = "red";
    } else {
        scoreColor = "blue";
    }

    var comparativeColor;
    if (parseInt(data.sentiment.score) > 0) {
        comparativeColor = "green";
    } else if (parseInt(data.sentiment.score) < 0) {
        comparativeColor = "red";
    } else {
        comparativeColor = "blue";
    }

    $(".livetweet").prepend(
        "<div class='data wordwrap'>" +
            "<div class='user-name'>" + data.user + "</div>" + 
            "<div class='tweet-text'>" + data.text + "</div>" +
            "<div class='coordinates'>coordinates: (" + data.coordinates[0] + ", " + data.coordinates[1] + ")</div>" +
            "<div class='sentiment score " + scoreColor + "'>score: " + data.sentiment.score + "</div>" +
            "<div class='sentiment comparative " + comparativeColor + "'>comparative: " + data.sentiment.comparative + "</div>" +
        "</div>"
    );
});


var options = {
    // scaleBeginAtZero: true,
    responsive: true,
    datasetFill: false,
    bezierCurve: false
};

function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}

var myBarChart = null;
Chart.types.Line.extend({
    name: "LineAlt",
    draw: function () {
        Chart.types.Line.prototype.draw.apply(this, arguments);

        var ctx = this.chart.ctx;
        var scale = this.scale;

        ctx.save();

        ctx.fillStyle = this.datasets[0].fillColor;
        ctx.beginPath();
        ctx.moveTo(scale.calculateX(0), scale.calculateY(0))
        this.datasets[0].points.forEach(function (point) {
            ctx.lineTo(point.x, point.y);
        })
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.datasets[1].fillColor;
        ctx.beginPath();
        ctx.moveTo(scale.calculateX(0), scale.calculateY(0))
        this.datasets[1].points.forEach(function (point) {
            ctx.lineTo(point.x, point.y);
        })
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
});





var fillChart = function (response) {
    console.log(response);

    var labels = [];
    var positives = [];
    var negatives = [];
    for (var i = 0; i < response.length; i++) {
        var day = response[i];
        var date = new Date(day.date);
        labels.push((date.getMonth() + 1) + "/" + date.getDate());
        positives.push(day.pos);
        negatives.push(day.neg)
    }

    // sample chart
    var data = {
        labels: labels,
        datasets: [
            {
                label: "Negative",
                fillColor: "rgba(220,18,20,0.5)",
                strokeColor: "rgba(220,18,20,0.8)",
                highlightFill: "rgba(220,18,20,0.75)",
                highlightStroke: "rgba(220,18,20,1)",
                data: negatives
            },
            {
                label: "Positive",
                fillColor: "rgba(22,220,22,0.5)",
                strokeColor: "rgba(22,220,22,0.8)",
                highlightFill: "rgba(22,220,22,0.75)",
                highlightStroke: "rgba(22,220,22,1)",
                data: positives
            }
        ]
    };

    if (myBarChart != null) {
        myBarChart.destroy();
    }

    var ctx = document.getElementById("myChart").getContext("2d");
    myBarChart = new Chart(ctx).LineAlt(data, options);

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
                url: "/sentiments/" + pokenumber
            }).done(fillChart);
        }
    }
});