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
		$("#moves").append("<ol></ol>");
		var places = $("#moves ol");
		for (var i = 0; i < moves.length; i++) {
			pi = moves[i];
			li_item = ["<li>Start time: ", pi.startTime, ", end time: ", pi.endTime, ", location: (", 
				pi.place.location.lat, ",", pi.place.location.lon, ") </li>"].join('');
			places.append( li_item );
		}
		console.log("ajax results", data[0])
	});
}