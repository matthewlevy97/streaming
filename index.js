var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var sio = require("socket.io");
var io = sio(http);
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');

var mysql = require('mysql');
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root"
});


con.query("CREATE DATABASE media_db", function (err, result) {
    if(!err) console.log("Database created");

    con.query("CREATE TABLE IF NOT EXISTS media_db.MediaList (" +
        "title VARCHAR(255) NOT NULL, artist VARCHAR(255) NOT NULL, publish_date VARCHAR(255)," +
        "url VARCHAR(255) NOT NULL, PRIMARY KEY(url))", function (err, result) {
        if(err) console.log(err);
    });
});


var startTime = new Date().getTime();
var playlist = [];
var times    = [];

// START OF ROUTES
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/static'));
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/templates/index.html");
});

// Admin Panel
app.get("/admin", function(req, res) {
    res.sendFile(__dirname + "/templates/admin.html");
});
app.post("/admin/media", function(req, res) {
    con.query("SELECT * FROM media_db.MediaList", function(err, result) {
        res.json(result);
    });
});
app.post("/admin/save", function(req, res) {
    var title = req.body.title;
    var artist = req.body.artist;
    var publish_date = req.body.publish_date;
    var url = req.body.url;

    // Insert into database
    con.query("INSERT INTO media_db.MediaList (title, artist, publish_date, url) values ?",
        [req.body], function(err, result) {
            if(err) res.json({success: false});
            else res.json({success: true});
    });

    for(var song in req.body) {
        playlist.push(req.body[song]);
        ffmpeg.ffprobe(__dirname + '/static/media/' + req.body[song][3], function(err, metadata) {
            times.push(metadata.format.duration);
        })
    }
});

// Player
app.get("/play", function(req, res) {
    res.sendFile(__dirname + "/templates/player.html");
});
// END OF ROUTES

con.query("SELECT * FROM media_db.MediaList", function(err, result) {
    for(var res in result) {
        playlist.push(result[res]);
        ffmpeg.ffprobe(__dirname + '/static/media/' + result[res].url, function(err, metadata) {
            times.push(metadata.format.duration);
        });
    }
});

io.on('connection', function(socket) {
    console.log("New connection");

    socket.on('disconnect', function(socket) {
        console.log("Connection died");
    });
    socket.on('playlist', function(msg) {
        socket.emit('playlist', {playlist: playlist, currentTime: (new Date().getTime() - startTime)});
    });
});

function advancePlayer() {
    console.log("Advancing player to next track");

    playlist.push(playlist.shift());
    times.push(times.shift());
    startTime = new Date().getTime();
    setTimeout(advancePlayer, (times[1] - (new Date().getTime() - startTime)) * 1000.0);

    console.log("Playing: " + playlist[0].title);
}

setTimeout(function() {
    setTimeout(advancePlayer, (times[1] - (new Date().getTime() - startTime)) * 1000.0);
}, 1000);

setInterval(function() {
    var time =  new Date().getTime() - startTime
    io.sockets.emit('sync', {currentTime: time}, {for: 'everyone'});
}, 1000);

http.listen(8000, function() {
    console.log("Listening on *:8000");
});