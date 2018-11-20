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

var theatres = [];
var playlist = {};

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

// Admin API
app.post("/admin/API/v1/pause", function(req, res) {
    var theatreNumber = req.body.theatreNumber;
    var pauseStatus = req.body.pause;
    
    if(pauseStatus) {
        pauseStream(theatreNumber);
    } else {
        resumeStream(theatreNumber);
    }

    res.json({'success': true});
});
app.post("/admin/API/v1/nextTrack", function(req, res) {
    var theatreNumber = req.body.theatreNumber;

    advancePlayer(theatreNumber);
    reloadPlaylist(theatreNumber);

    res.json({'success': true});
});
app.post("/admin/API/v1/updatePlaylist", function(req, res) {
    var theatreNumber = req.body.theatreNumber;
    var playlist = req.body.playlist;

    theatres[theatreNumber].playlist = [];
    for(var i = 0; i < playlist.length; i++) {
        addMedia(theatreNumber, playlist[i]);
    }

    res.json({'success': true});
});
app.post("/admin/API/v1/media", function(req, res) {
    var result = {'playlist': playlist, 'theatres': []};
    for(var i = 0; i < theatres.length; i++) {
        var theatre = theatres[i];
        result['theatres'].push({
            'theatre': theatre['theatre'],
            'startTime': theatre['startTime'],
            'playlist': theatre['playlist'],
            'paused': theatre['paused'],
            'activeUsers': theatre['activeUsers'],
        });
    }

    res.json(result);
});
app.post("/admin/API/v1/create", function(req, res) {
    createTheatre();
    res.json({'success': true});
});
app.post("/admin/API/v1/save", function(req, res) {
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

    result = req.body;
    for(var song in result) {
        playlist[result[song][3]] = {
            'title': result[song][0],
            'artist': result[song][1],
            'publish_date': result[song][2],
            'url': result[song][3]
        };
        ffmpeg.ffprobe(__dirname + '/static/media/' + result[song][3], function(err, metadata) {
            var currentMedia = metadata.format.filename.replace(__dirname + '/static/media/', '');
            playlist[currentMedia]['duration'] = metadata.format.duration;
        });
    }
});

// Player
app.get("/play", function(req, res) {
    res.sendFile(__dirname + "/templates/player.html");
});
// END OF ROUTES

con.query("SELECT * FROM media_db.MediaList", function(err, result) {
    for(var res in result) {
        playlist[result[res].url] = {
            'title': result[res].title,
            'artist': result[res].artist,
            'publish_date': result[res].publish_date,
            'url': result[res].url
        };
        ffmpeg.ffprobe(__dirname + '/static/media/' + result[res].url, function(err, metadata) {
            var currentMedia = metadata.format.filename.replace(__dirname + '/static/media/', '');
            playlist[currentMedia]['duration'] = metadata.format.duration;
        });
    }
});

function createTheatre() {
    var theatreNumber = theatres.length;
    
    var stream = io.of('/stream/' + theatreNumber);
    stream.currentTheatre = theatreNumber;

    theatres.push({'theatre': theatreNumber, 'stream': stream, 'activeUsers': 0,
        'startTime': new Date().getTime(), 'playlist': [], 'paused': {'startTime': null, 'status': false}});

    stream.on('connection', function(socket) {
	theatres[stream.currentTheatre]['activeUsers']++;
	socket.on('disconnect', function() {
		theatres[stream.currentTheatre]['activeUsers']--;
	});
	
        socket.on('playlist', function(msg) {
            socket.emit('playlist', {playlist: theatres[stream.currentTheatre]['playlist'],
                currentTime: (new Date().getTime() - theatres[stream.currentTheatre]['startTime'])});
        });
    });

    console.log('Created new theatre: ' + theatreNumber);
}

function pauseStream(theatreNumber) {
    if(!theatres[theatreNumber]['paused']['status']) {
        console.log('Pausing stream ' + theatreNumber);

        // Save the time the stream was paused at
        theatres[theatreNumber]['paused']['status'] = true;
        theatres[theatreNumber]['paused']['startTime'] = new Date().getTime();

        theatres[theatreNumber]['stream'].emit('pause');
    }
}
function resumeStream(theatreNumber) {
    if(theatres[theatreNumber]['paused']['status']) {
        console.log('Resuming stream ' + theatreNumber);

        // Calculate pause duration and add that to the start time of the stream
        theatres[theatreNumber]['paused']['status'] = false;
        theatres[theatreNumber]['startTime'] += (new Date().getTime() - theatres[theatreNumber]['paused']['startTime']);

        theatres[theatreNumber]['stream'].emit('resume');
    }
}

function addMedia(theatreNumber, mediaName) {
    for(var media in playlist) {
        if(media === mediaName.url) {
            theatres[theatreNumber]['playlist'].push(playlist[media]);
            console.log('Added ' + mediaName.url + ' to theatre ' + theatreNumber);
            return;
        }
    }

    console.log('Could not add media ' + mediaName);
}

function reloadPlaylist(theatreNumber) {
    console.log('Reloading Playlist ' + theatreNumber);
    theatres[theatreNumber]['stream'].emit('reloadPlaylist');
}

function advancePlayer(theatreNumber) {
    console.log("Advancing player to next track");
    
    if(theatres[theatreNumber]['playlist'].length == 0) {
        console.log("Playlist empty");
        return;
    }
    
    theatres[theatreNumber]['playlist'].push(theatres[theatreNumber]['playlist'].shift());
    theatres[theatreNumber]['startTime'] = new Date().getTime();

    console.log("Playing: " + theatres[theatreNumber]['playlist'][0].title);
}

function setupSyncing() {
    for(var i = 0; i < theatres.length; i++) {
        var theatre = theatres[i];
        var time =  new Date().getTime() - theatre['startTime'];
        
        if(!theatre.paused.status && theatre.playlist.length > 0) {
            if(theatre['playlist'][0]['duration'] * 1000 <= new Date().getTime() - theatre['startTime']) {
                advancePlayer(i);
            }
        }
        
        theatre['stream'].emit('sync', {currentTime: time});
    }
}

setInterval(setupSyncing, 1000);

http.listen(8000, function() {
    console.log("Listening on *:8000");
});
