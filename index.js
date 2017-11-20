var express = require("express");
var app = express();
var http = require("http").Server(app);
var sio = require("socket.io");
var io = sio(http);
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');

var startTime = new Date().getTime();
var playlist = [];
var times    = [];
fs.readdirSync(__dirname + '/static/media').forEach(file => {
    playlist.push(file);
    ffmpeg.ffprobe(__dirname + '/static/media/' + file, function(err, metadata) {
        times.push(metadata.format.duration);
    });
});

app.use(express.static(__dirname + '/static'));
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/templates/index.html");
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
    setTimeout(advancePlayer, (times[0] - (new Date().getTime() - startTime)) * 1000.0);
}

setTimeout(function() {
    setTimeout(advancePlayer, (times[0] - (new Date().getTime() - startTime)) * 1000.0);
}, 1000);

setInterval(function() {
    var time =  new Date().getTime() - startTime
    io.sockets.emit('sync', {currentTime: time}, {for: 'everyone'});
}, 1000);

http.listen(8000, function() {
    console.log("Listening on *:8000");
});