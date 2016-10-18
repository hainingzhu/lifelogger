var moves;

$('document').ready(function(){
	// setup the date time picker.
    $( "#datepicker" ).datepicker();
	get_moves_places();
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
	});
}