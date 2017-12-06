$(document).ready(function() {

    var mediaURL  = "/media/";
    var mediaList = [];
    var tracker = 0;

    var muted   = true;

    var $currentPlayer = null;
    var $other = null;

    var mediaStartTime = 0;
    var playerInitialized = false;
    var started = false;

    var syncDiffVal = 0.1;
    var syncDiffMisses = 0;

    var socket = io();

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
            id: "video_player_1",
            class: "media_player"
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
            id: "video_player_2",
            class: "media_player"
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
            $("#videoInfoTitle").html(mediaList[(tracker - 2) % mediaList.length].title);
            $("#videoInfoArtist").html(mediaList[(tracker - 2) % mediaList.length].artist);
            $("#videoInfoPubDate").html(mediaList[(tracker - 2) % mediaList.length].publish_date);
        });
        $player1.on("ended", function() {
            console.log("player1 ended");
            $player1.hide();

            $player1.get(0).src = mediaURL + mediaList[tracker++ % mediaList.length].url;

            $player2.get(0).play();
            $player2.show();
        });
        $player2.on('play', function() {
            $("#videoInfoTitle").html(mediaList[(tracker - 2) % mediaList.length].title);
            $("#videoInfoArtist").html(mediaList[(tracker - 2) % mediaList.length].artist);
            $("#videoInfoPubDate").html(mediaList[(tracker - 2) % mediaList.length].publish_date);
        });
        $player2.on("ended", function() {
            console.log("player 2 ended");
            $player2.hide();

            $player2.get(0).src = mediaURL + mediaList[tracker++ % mediaList.length].url;

            $player1.get(0).play();
            $player1.show();
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

        $("#streamable").append($player1);
        $("#streamable").append($player2);
        $("#streamable").append($muteImage);
        $("#streamable").append($playImage);

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

        $('#streamable').on('click', function() {
            if(!started) {
                $other = $player2;
                $currentPlayer = $player1;

                $currentPlayer.get(0).play();
                $currentPlayer.get(0).currentTime = mediaStartTime;

                started = true;
            }

            muted = !muted;
            $player1.prop("muted", muted);
            $player2.prop("muted", muted);

            splash($player1);
        });

        playerInitialized = true;
        console.log("Player Created");
    }

    console.log("Connected to server");
    socket.on('sync', function(msg) {
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
        }
    });

    // Load initial information
    socket.emit('playlist');

    $("body").css("background-color", "black");

    // Setup done
    console.log("Setup Done");
});