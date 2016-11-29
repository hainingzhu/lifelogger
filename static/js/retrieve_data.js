var moves;
var rescuetime;
var fitbit;

$('document').ready(function(){
	// setup the date time picker.
    $( "#datepicker" ).datepicker();
	get_moves_places();
	get_rescutime_timechart();
	get_fitbit_timechart();
});

/*
Return the current date as delimiter separated string.
If delimiter is '', return YYYYMMDD, used in Moves API.
If delimiter is '-', return YYYY-MM-DD, used in Fitbit API.
*/
function getDate(delimiter) {
	var d = new Date();
	var y = d.getFullYear();
	var mm = (d.getMonth() + 1).toString();
	if (mm.length == 1)
		mm = '0' + mm
	var dd = d.getDate().toString();
	if (dd.length == 1)
		dd = '0' + dd
	dateStr = [y, mm, dd].join(delimiter);
	return dateStr;
}


function get_moves_places() {
	var dateStr = getDate("");
	$.ajax({
		url: SCRIPT_ROOT + "/moves_places/" + dateStr,
		dataType: "json"
	}).done(function(data) {
		moves = data[0]['segments'];
        if (moves == null) {
            var map = new google.maps.Map($('#moveschart')[0], {
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
            var map = new google.maps.Map($('#moveschart')[0], {
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
		url: SCRIPT_ROOT + "/rescuetime_timechart",
		dataType: "json"
	}).done(function(data) {
		rescuetime = data;
		sumProd = Math.ceil(rescuetime[24].totalProductive);
		sumDist = Math.ceil(rescuetime[24].totalDistracting);
		$("#phour").html(Math.floor(sumProd/60));
		$("#pmin").html(sumProd % 60);
		$("#dhour").html(Math.floor(sumDist/60));
		$("#dmin").html(sumDist % 60);
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
		var chart = new CanvasJS.Chart("rescuetimechart", {
			title: {
				text: "RescueTime -- Productivity"
			},
			legend: {
				horizontalAlign: "center",
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


function get_fitbit_timechart() {
	var dateStr = getDate('-');
	$.ajax({
		url: SCRIPT_ROOT + "/fitbit_activity/" + dateStr,
		dataType: "json"
	}).done(function(data) {
		fitbit = data;
		var steps = fitbit[0];
		$("#steps").html(steps);
		var ts = fitbit[1];
		var intraday_steps = [];
		for (var i = 0; i < ts.length; i++) {
			intraday_steps[i] = {
				y: ts[i],
				label: i+":00"
			};
		}
		// barplot with CanvasJS
		var chart = new CanvasJS.Chart("fitbitchart", {
			title: {
				text: "Fitbit -- Intra-day Steps"
			},
			legend: {
				horizontalAlign: "center",
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
				title: 'Steps',
				minimum: 0,
				maximum: (Math.floor(Math.max.apply(null, ts)/100) + 1) * 100
			},
			data: [
			{
				type: "bar",
				showInLegend: true,
				legendText: "Steps",
				color: "#014D65",
				dataPoints: intraday_steps
			}
			]
		});
		chart.render();
	});
}



/*
Add row for the manually input survey
*/
function addRow(tableID) {

  var table = document.getElementById(tableID);

  var rowCount = table.rows.length;
  var row = table.insertRow(rowCount);

  var colCount = table.rows[0].cells.length;

  for(var i=0; i<colCount; i++) {

	var newcell = row.insertCell(i);

	newcell.innerHTML = table.rows[1].cells[i].innerHTML;
	//alert(newcell.childNodes);
	switch(newcell.childNodes[0].type) {
	  case "text":
		  newcell.childNodes[0].value = "";
		  break;
	  case "checkbox":
		  newcell.childNodes[0].checked = false;
		  break;
	  case "select-one":
		  newcell.childNodes[0].selectedIndex = 0;
		  break;
	}
  }
}
	
	
