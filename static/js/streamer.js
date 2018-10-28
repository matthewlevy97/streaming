function GetURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');

    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if(sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
    return 0;
}

$(document).ready(function() {
    var mediaURL  = "/media/";
    var mediaList = [];
    var tracker = 0;

    var muted   = true;
    var paused  = false;

    var $currentPlayer = null;
    var $other = null;

    var mediaStartTime = 0; // Start time of media player
    var playerInitialized = false;  // Is the media player initialized?
    var started = false;    // Used to tell muted function if should autosync (TODO: Possibly remove)
    var fullscreen = false; // Is the display in fullscreen
    
    var syncDiffVal = 0.1;
    var syncDiffMisses = 0;

    var streamNumber = GetURLParameter('theatreNumber');
    var socket = io('/stream/' + streamNumber);

    function toggleMute() {
        //if(!$currentPlayer) return;
        
        if(!started) { 
            $currentPlayer.get(0).play();
            $currentPlayer.get(0).currentTime = mediaStartTime;

            started = true;
        }

        muted = !muted;
        $currentPlayer.prop("muted", muted);
        $other.prop("muted", muted);

        splash($currentPlayer);
    }
    function makeFullScreen($player) {
        if(!$player) return;
        
        var elem = $player.get(0);
        
        if(fullscreen) {
            if (elem.exitFullscreen) {
                elem.exitFullscreen();
            } else if (elem.mozCancelFullScreen) {
                elem.mozCancelFullScreen();
            } else if (elem.webkitExitFullscreen) {
                elem.webkitExitFullscreen();
            } else if (elem.msExitFullscreen) { 
                elem.msExitFullscreen();
            }
        } else {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { 
                elem.msRequestFullscreen();
            }
        }
        
        fullscreen = !fullscreen;
    }
    
    // This will display something when the user clicks
    function splash($player) {
        if(muted) {
            $("#muteImage").show();
            $("#mutedImage").css("opacity", "1");
            $("#muteImage").fadeTo(1000, 0.4);
        } else {
            $("#muteImage").fadeOut("fast", function() {
                $("#playImage").show();
                $("#playImage").fadeOut(1000);
            })
        }
    }

    function createPlayer() {
        console.log("Creating media player");

        if(mediaList[0] == null) {
            console.log("No media to play");
            return;
        }

        // Player 1
        var $player1 = $("<video>", {
            'id': 'video_player_1',
            'class': 'media_player',
            'data-dashjs-player': '',
        });
        $player1.append(
            $("<source>", {
                id: "player_source",
                src: mediaURL + mediaList[tracker++ % mediaList.length].url,
                type: "video/webm"
            })
        );

        // Player 2
        var $player2 = $("<video>", {
            'id': 'video_player_2',
            'class': 'media_player',
            'data-dashjs-player': '',

        });
        $player2.append(
            $("<source>", {
                id: "player_2_source",
                src: mediaURL + mediaList[tracker++ % mediaList.length].url,
                type: "video/webm"
            })
        );
        $player2.hide();

        // Add event handlers
        $player1.on('play', function() {
            $("#videoInfo").show();
            $("#videoInfoTitle").html(mediaList[(tracker - 2) % mediaList.length].title);
            $("#videoInfoArtist").html(mediaList[(tracker - 2) % mediaList.length].artist);
            $("#videoInfoPubDate").html(mediaList[(tracker - 2) % mediaList.length].publish_date);
            setTimeout(function() {$("#videoInfo").fadeOut("slow");}, 5000);
        });
        $player1.on("ended", function() {
            console.log("player1 ended");
            $player1.hide();

            $player2.get(0).play();
            $player2.show();
            
            $player1.get(0).src = mediaURL + mediaList[tracker++ % mediaList.length].url;
        });
        $player2.on('play', function() {
            $("#videoInfo").show();
            $("#videoInfoTitle").html(mediaList[(tracker - 2) % mediaList.length].title);
            $("#videoInfoArtist").html(mediaList[(tracker - 2) % mediaList.length].artist);
            $("#videoInfoPubDate").html(mediaList[(tracker - 2) % mediaList.length].publish_date);
            setTimeout(function() {$("#videoInfo").fadeOut("slow");}, 5000);
        });
        $player2.on("ended", function() {
            console.log("player 2 ended");
            $player2.hide();
            
            $player1.get(0).play();
            $player1.show();
            
            $player2.get(0).src = mediaURL + mediaList[tracker++ % mediaList.length].url;
        });

        var $muteImage = $("<img>", {
            id: "muteImage",
            src: "images/mute.svg",
            class: "video-overlay-button mute-button",
            alt: "Muting"
        });
        $muteImage.hide();
        var $playImage = $("<img>", {
            id: "playImage",
            src: "images/play.svg",
            class: "video-overlay-button play-button",
            alt: "Playing"
        });
        var $pauseImage = $("<img>", {
            id: "pauseImage",
            src: "images/pause.svg",
            class: "video-overlay-button pause-button",
            alt: "Paused"
        });
        $pauseImage.hide();

        $("#streamable").append($player1);
        $("#streamable").append($player2);
        $("#streamable").append($muteImage);
        $("#streamable").append($playImage);
        $("#streamable").append($pauseImage);

        var $videoInfo = $("<div>", {
            id: "videoInfo"
        }).append(
            $("<span>", {id: "videoInfoTitle"})
        ).append($("<br>")).append(
            $("<span>", {id: "videoInfoArtist"})
        ).append($("<br>")).append(
            $("<span>", {id: "videoInfoPubDate"})
        );
        $("#streamable").append($videoInfo);
        
        $other = $player2;
        $currentPlayer = $player1;
         
        playerInitialized = true;
        console.log("Player Created");
    }

    function reloadMedia() {
        if(!$currentPlayer || !$other) return;
        
        tracker = 0;
        $other.get(0).src = mediaURL + mediaList[tracker++ % mediaList.length].url;
        $other.get(0).play();
        $other.show();

        $currentPlayer.get(0).pause();
        $currentPlayer.hide();
        $currentPlayer.get(0).src = mediaURL + mediaList[tracker++ % mediaList.length].url;

        var $temp = $currentPlayer;
        $currentPlayer = $other;
        $other = $temp;
    }

    console.log("Connected to server");
    socket.on('sync', function(msg) {
        if(paused) return;

        mediaStartTime = msg.currentTime / 1000.0;

        if($currentPlayer) {
            if(Math.abs($currentPlayer.get(0).currentTime - mediaStartTime) >= 0.5) {
                syncDiffMisses = 10;
                syncDiffVal += 0.1;

                // We will eat the null error here
                $currentPlayer.get(0).currentTime = mediaStartTime;
            }
        }
    });
    socket.on('playlist', function(msg) {
        mediaList = msg.playlist;
        mediaStartTime = msg.currentTime / 1000.0;

        if(!playerInitialized) {
            createPlayer();
        } else {
            reloadMedia();
        }
    });
    socket.on('pause', function(msg) {
        $currentPlayer.get(0).pause();
        paused = true;

        $("#pauseImage").show();
        $("#pauseImage").css("opacity", "1");
        $("#pauseImage").fadeTo(1000, 0.4);
    });
    socket.on('resume', function(msg) {
        $currentPlayer.get(0).play();
        paused = false;

        $("#pauseImage").hide();
    });
    socket.on('reloadPlaylist', function(msg) {
        socket.emit('playlist');
    });

    // Load initial information
    socket.emit('playlist');

    $("body").css("background-color", "black");
    $("body").keydown(function(event) {
        switch(event.which)
        {
        case 70: // 'F' key
            makeFullScreen($currentPlayer); break;
        case 32: // Space key
            toggleMute(); break;
        }
    });

    // Setup done
    console.log("Setup Done");
});