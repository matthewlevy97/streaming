$(document).ready(function() {

    var mediaURL  = "/media/";
    var mediaList = ["current", "next"];
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

        // Player 1
        var $player1 = $("<video>", {
            id: "video_player_1",
            class: "media_player"
        });
        $player1.append(
            $("<source>", {
                id: "player_source",
                src: mediaURL + mediaList[tracker++ % mediaList.length],
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
                src: mediaURL + mediaList[tracker++ % mediaList.length],
                type: "video/webm"
            })
        );
        $player2.hide();

        // Add event handlers
        $player1.on('play', function() {
            var temp = $other;
            $other = $currentPlayer;
            $currentPlayer = temp;
        });
        $player2.on('play', function() {
            var temp = $other;
            $other = $currentPlayer;
            $currentPlayer = temp;
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

        $('#streamable').on('click', function() {
            if(!started) {
                $other = $player2;
                $currentPlayer = $player1;

                $currentPlayer.get(0).play();
                $currentPlayer.get(0).currentTime = mediaStartTime;

                reload();
                started = true;
            }

            muted = !muted;
            $player1.prop("muted", muted);
            $player2.prop("muted", muted);

            splash($player1);
        });

        // Play the next track
        function reload() {
            var timeout = ($currentPlayer.get(0).duration - $currentPlayer.get(0).currentTime);
            if(timeout <= 0.05) {
                $other.get(0).play();
                $other.show();

                $currentPlayer.hide();

                $currentPlayer.get(0).src = mediaURL + mediaList[tracker++ % mediaList.length];
            }

            // Decreases the delay as the next track approaches
            timeout *= 500.0;
            setTimeout(reload, timeout > 50 ? timeout : 50);
        }

        playerInitialized = true;
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
            console.log("Player Created");
        }
    });

    // Load initial information
    socket.emit('playlist');

    // Setup done
    console.log("Setup Done");
});