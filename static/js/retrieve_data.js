var moves;
var rescuetime;

$('document').ready(function(){
	// setup the date time picker.
    $( "#datepicker" ).datepicker();
	get_moves_places();
	get_rescutime_timechart();
});



function get_moves_places() {
	var d = new Date();
	var y = d.getFullYear();
	var mm = (d.getMonth() + 1).toString();
	if (mm.length == 1)
		mm = '0' + mm
	var dd = d.getDate().toString();
	if (dd.length == 1)
		dd = '0' + dd
	dateStr = [y, mm, dd].join('');
	$.ajax({
		url: "/moves_places/" + dateStr,
		dataType: "json"
	}).done(function(data) {
		moves = data[0]['segments'];
        if (moves == null) {
            var map = new google.maps.Map($('#moves')[0], {
                zoom: 12,
                center: {lat: 40.794356, lng: -77.858171}
            });
        } else {
            var places = [];
            var place_titles = [];
            var center = [0, 0];	// [lat, lng]
            
            for (var i = 0; i < moves.length; i++) {
                pi = moves[i];
                pi_lat = pi.place.location.lat;
                pi_lon = pi.place.location.lon;
                
                li_item = ["Start time: ", pi.startTime, ", end time: ", pi.endTime, ", location: (", 
                    pi_lat, ",", pi_lon, ")"].join('');
                place_titles.push(li_item)
                console.log(li_item)
                
                center[0] += pi_lat;
                center[1] += pi_lon;
                
                places.push( [pi_lat, pi_lon] );
            }
            center[0] /= places.length;
            center[1] /= places.length;
            var map_center = {lat: center[0], lng: center[1]};
            var map = new google.maps.Map($('#moves')[0], {
                zoom: 12,
                center: map_center
            });
            for (var i = 0; i < places.length; i++) {
                var position = {lat: places[i][0], lng: places[i][1]};
                var marker = new google.maps.Marker({
                    position: position,
                    map: map,
                    title: place_titles[i]
                });
            }
        }
	});
}


function get_rescutime_timechart() {
	$.ajax({
		url: "/rescuetime_timechart",
		dataType: "json"
	}).done(function(data) {
		rescuetime = data;
		productivePoints = [];
		distractingPoints = [];
		for (var i = 0; i < data.length; i++) {
			productivePoints[i] = {
				y: data[i]['productive'], 
				label: i + ":00"
			};
			distractingPoints[i] = {
				y: data[i]['distracting'],
				label: i + ":00"
			};
		}
		// barplot with CanvasJS
		var chart = new CanvasJS.Chart("rescuetime", {
			title: {
				text: "RescueTime -- Productivity"
			},
			legend: {
				horizontalAlign: "right",
				verticalAlign: "top"
			},
			axisX: {
				title: "Time by Hour",
				minimum: 0,
				maximum: 23,
				interval: 1,
				reversed: true
			},
			axisY: {
				title: "Duration (minutes)",
				minimum: 0,
				maximum: 60
			},
			data: [
			{
				type: "bar",
				showInLegend: true,
				legendText: "Productive time",
				dataPoints: productivePoints
			},
			{
				type: "bar",
				showInLegend: true,
				legendText: "Distracting time",
				dataPoints: distractingPoints
			}
			]
		});
		chart.render();
	});
}
