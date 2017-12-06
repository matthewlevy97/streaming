$(document).ready(function(){

    $.makeTable = function (mydata) {
        var table = $('<table border=1>');
        var tblHeader = "<tr>";
        var headers = ['title', 'artist', 'publish date', 'url'];
        for (var k in headers) {
            tblHeader += "<th>" + headers[k] + "</th>";
        }
        
        tblHeader += "</tr>";
        $(tblHeader).appendTo(table);
        $.each(mydata, function (index, value) {
            var TableRow = "<tr>";
            $.each(value, function (key, val) {
                if(val == "") { val = "N/A"; }
                TableRow += "<td>" + val + "</td>";
            });
            TableRow += "</tr>";
            $(table).append(TableRow);
        });
        return ($(table));
    };

    function saveData(data) {
        $.ajax({
            type: "POST",
            url: "/admin/save",
            dataType: 'json',
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(data) {
                if(data && data.success) {
                    alert("Data stored successfully");
                } else {
                    alert("Failed to save data");
                }
            }
        });
    }

    function getData() {
        $.ajax({
            type: "POST",
            url: "/admin/media",
            dataType: 'json',
            success: function(data) {
                $.makeTable(data).appendTo("#mediaTbl");
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

    getData();
});