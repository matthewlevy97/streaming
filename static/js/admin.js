$(document).ready(function() {
    const API_ROUTE = "/admin/API/v1";

    var playlist = [];
    var theatres = [];

    function isFloat(n){
        return Number(n) === n && n % 1 !== 0;
    }

    $.makeTable = function (data, headers) {
        var table = $('<table>', {'border': 1, 'class': 'table table-bordered'});
        var tblHeader = "<tr>";
        for (var k in headers) {
            tblHeader += "<th>" + headers[k] + "</th>";
        }
        
        tblHeader += "</tr>";
        $(tblHeader).appendTo(table);
        $.each(data, function (index, value) {
            var TableRow = "<tr>";
            $.each(value, function (key, val) {
                if(val == "") { val = "N/A"; }
                if(isFloat(val)) val = Math.round(Number(val));
                TableRow += "<td>" + val + "</td>";
            });
            TableRow += "</tr>";
            $(table).append(TableRow);
        });
        return ($(table));
    };

    function displayTheatres(theatres) {
        for(var theatreNumber = 0; theatreNumber < theatres.length; theatreNumber++) {
            var theatre = theatres[theatreNumber];
            /*
            'theatre': theatre['theatre'],
            'startTime': theatre['startTime'],
            'playlist': theatre['playlist'],
            'paused': theatre['paused']
            */
            var $theatreDiv = $('<div>', {'class': 'well'});
            $theatreDiv.val(theatreNumber);
            
            var $theatreStatus = $('<div>');
            
            $('<h3>').text('Theatre: ' + theatre.theatre).appendTo($theatreStatus);
            
            // Display current time for theatre
            var theatreTime = (theatre.paused.status ? theatre.paused.startTime : new Date().getTime());
            var $currentTimeText = $('<h4>').text(
                'Current Time: ' + Math.floor((theatreTime - theatre.startTime) / 1000));
            $currentTimeText.appendTo($theatreStatus);
            
            // Pause / resume currently playing media
            var $statusText = $('<h4>').text('Status: ');
            var $pauseButton = $('<button>', {
                    'class': 'btn ' + (theatre.paused.status ? 'btn-success' : 'btn-danger') + ' admin-pause-button'
                })
                .text((theatre.paused.status ? 'Resume' : 'Pause'))
                .click(function() {
                    var theatreNumber = $(this).parent().parent().parent().val();
                    pauseTheatre(theatreNumber, !theatres[theatreNumber].paused.status);
                    getData();
                });
            $statusText.appendTo($theatreStatus);
            var $advanceTrackButton = $('<button>', {'class': 'btn btn-primary admin-advance-button'})
                .text('Next')
                .click(function() {
                    var theatreNumber = $(this).parent().parent().parent().val();
                    nextTrack(theatreNumber);
                    getData();
                });
            $statusText.appendTo($theatreStatus);
            $pauseButton.appendTo($statusText);
            $advanceTrackButton.appendTo($statusText)

            // Display playlist for theatre
            var $playlistDiv = $('<div>');
            $.makeTable(
                theatre.playlist,
                ['Title', 'Artist', 'Publish Date', 'Filename', 'Duration (seconds)']
            ).appendTo($playlistDiv);
            
            // Add media to playlist
            var $addMediaDiv = $('<div>');
            var $mediaSelect = $('<select>');
            $mediaSelect.append($("<option>").attr('value', '').text(''));
            for(var media in playlist) {
                $mediaSelect.append(
                    $("<option>").attr('value', media)
                        .text(playlist[media].title + ' - ' + playlist[media].artist)
                );
            }
            var $mediaAddButton = $('<button>', {'class': 'btn btn-primary admin-add-media-button'})
                .text('Add Media')
                .click(function() {
                    var theatreNumber = $(this).parent().parent().val();
                    var $mediaSelect  = $($(this).parent().children().get(0));

                    if($mediaSelect.val() == '') return;
                    
                    theatres[theatreNumber].playlist.push(playlist[$mediaSelect.val()]);
                    updatePlaylist(theatreNumber, theatres[theatreNumber].playlist);

                    getData();
                });
            $mediaSelect.appendTo($addMediaDiv);
            $mediaAddButton.appendTo($addMediaDiv);

            // Attach everything
            $theatreStatus.appendTo($theatreDiv);
            $playlistDiv.appendTo($theatreDiv);
            $addMediaDiv.appendTo($theatreDiv);
            $theatreDiv.appendTo($('#theatres'));
        }
    }

    function saveData(data) {
        $.ajax({
            type: "POST",
            url: API_ROUTE + "/save",
            dataType: 'json',
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(data) {
                if(data && data.success) {
                    console.log("Data stored successfully");
                } else {
                    console.log("Failed to save data");
                }
            }
        });
    }

    function getData() {
        $.ajax({
            type: "POST",
            url: API_ROUTE + "/media",
            dataType: 'json',
            success: function(data) {
                playlist = data.playlist;
                theatres = data.theatres;
                
                // Clean old data
                $('table').remove();
                $('#theatres').empty();

                $.makeTable(data.playlist, ['Title', 'Artist', 'Publish Date', 'Filename', 'Duration (seconds)'])
                    .appendTo("#mediaTbl");
                displayTheatres(data.theatres);
            }
        });
    }

    /*
        theatreNumber: Number of the theatre to affect
        status: True to pause theatre, False to resume
    */
    function pauseTheatre(theatreNumber, status) {
        $.ajax({
            type: "POST",
            url: API_ROUTE + "/pause",
            dataType: 'json',
            data: JSON.stringify({'theatreNumber': theatreNumber, 'pause': status}),
            contentType: "application/json",
            success: function(data) {
                if(data && data.success) {
                    console.log("Status changed");
                } else {
                    console.log("Failed to change status");
                }
            }
        });
    }

    function createNewTheatre() {
        $.ajax({
            type: "POST",
            url: API_ROUTE + "/create",
            contentType: "application/json",
            success: function(data) {
                if(data && data.success) {
                    console.log("Created new theatre");
                } else {
                    console.log("Failed to created new theatre");
                }
            }
        });
    }

    function updatePlaylist(theatreNumber, playlist) {
        $.ajax({
            type: "POST",
            url: API_ROUTE + "/updatePlaylist",
            dataType: 'json',
            data: JSON.stringify({'theatreNumber': theatreNumber, 'playlist': playlist}),
            contentType: "application/json",
            success: function(data) {
                if(data && data.success) {
                    console.log("Playlist changed");
                } else {
                    console.log("Failed to change playlist");
                }
            }
        });
    }

    function nextTrack(theatreNumber) {
        $.ajax({
            type: "POST",
            url: API_ROUTE + "/nextTrack",
            dataType: 'json',
            data: JSON.stringify({'theatreNumber': theatreNumber}),
            contentType: "application/json",
            success: function(data) {
                if(data && data.success) {
                    console.log("Loaded next track");
                } else {
                    console.log("Failed to load next track");
                }
            }
        });
    }

    $("#submitBtn").on('click', function() {
        var form = $("#insertData").get(0);
        var artist = form[0];
        var title = form[1];
        var publish_date = form[2];
        var url = form[3];

        // Ensure no default values
        if(artist.value == artist.defaultValue || title.value == title.defaultValue ||
            url.value == url.defaultValue) {
            console.log("Default value not changed");
        } else {
            var data = [];

            data.push(title.value);
            data.push(artist.value);
            
            if(publish_date.value == publish_date.defaultValue) {
                data.push("");
            } else {
                data.push(publish_date.value);
            }

            data.push(url.value);

            // Send data to server to save
            saveData([data]);
        }
    })

    $("#newTheatreBtn").on('click', function() {
        createNewTheatre();
        getData();
    });

    getData();
    setInterval(getData, 5000);
});
