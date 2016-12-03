var moves;
var rescuetime;
var fitbit;
var focus = 0;
var rowId = 10;
var pie = {"Work": 0, "Leisure": 0, "Personal maintenance": 0, "Other": 24*60};

$('document').ready(function(){
	// setup the date time picker.
    $( "#datepicker" ).datepicker();
	get_moves_places();
	get_rescutime_timechart();
	get_fitbit_timechart();
	$("input[type='time'][name^='time_end']").each(function(idx, ele) {
		$(ele).blur(checkTime_updatePie);
	});
	updatePieChart();
});


/*
Call back function for one entry is entered.

When user inputs time end for one manual input entry,
this function is called to calculate the new Pie chart.
*/
function checkTime_updatePie() {
	var rowId = this.name.substring(8);
	var startName = "time_began" + rowId;
	var endName = this.name;
	var code = $("select[name='code"+rowId+"']").val();
	var startTime = $("input[name='"+startName+"']").val();
	var endTime = $("input[name='"+endName+"']").val();
	var tmp = duration(startTime, endTime);
	if (isNaN(tmp)) {
		console.log("Time has wrong format!");
		alert("Time has wrong format!");
	}else if (tmp < 0) {
		console.log("End time is smaller than starting time!");
		alert("End time is smaller than starting time!");
	} else {
		pie[code] += tmp;
		pie["Other"] -= tmp;
		console.log(tmp + " mins in " + code);
	}
	updatePieChart();
}

function updatePieChart() {
	pieData = [];
	markerType = ["triangle", "square", "circle", "cross"];
	var i = 0;
	for (var code in pie) {
		pieData.push({
			y: pie[code],
			name: code,
			legendMarkerType: markerType[i]
		});
		i += 1;
	}
	var chart = new CanvasJS.Chart("pieChart",
	{
		title:{
			text: "How my time is spent in a day?",
			fontFamily: "arial black",
			fontsize:16,
		},
                animationEnabled: true,
		legend: {
			verticalAlign: "top",
			horizontalAlign: "center",
			fontsize:10,
		},
		theme: "theme1",
		data: [
		{        
			type: "pie",
			indexLabelFontFamily: "Garamond",       
			indexLabelFontSize: 14,
			indexLabelFontWeight: "bold",
			startAngle:0,
			indexLabelFontColor: "MistyRose",       
			indexLabelLineColor: "darkgrey", 
			indexLabelPlacement: "inside", 
			toolTipContent: "{name}: {y} mins",
			showInLegend: true,
			indexLabel: "#percent%", 
			dataPoints: pieData
		}
		]
	});
	chart.render();
}


function duration(startTime, endTime) {
	var sm = parseInt(startTime.substring(0,2)) * 60 + parseInt(startTime.substring(3));
	var em = parseInt(endTime.substring(0,2)) * 60 + parseInt(endTime.substring(3));
	return em - sm;
}

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
			var time_surfix;
			var lb = i%12;
			if (i == 12) {
				lb = 12;
			}
			if (i>=12) {
				time_surfix = "pm";
			} else {
				time_surfix = "am";
			}
			productivePoints[i] = {
				y: data[i]['productive'], 
				label: lb + ":00 " + time_surfix
			};
			distractingPoints[i] = {
				y: data[i]['distracting'],
				label: lb + ":00 " + time_surfix
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
				dataPoints: productivePoints,
				color: "#5DADE2"
			},
			{
				type: "bar",
				showInLegend: true,
				legendText: "Distracting time",
				dataPoints: distractingPoints,
				color: "#EF1903"
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
			var time_surfix;
			var lb = i%12;
			if (i == 12) {
				lb = 12;
			}
			if (i>=12) {
				time_surfix = "pm";
			} else {
				time_surfix = "am";
			}
			intraday_steps[i] = {
				y: ts[i],
				label: lb+":00 "+time_surfix
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
				color:"#58D68D",
				dataPoints: intraday_steps,
				
			}
			]
		});
		chart.render();
	});
}



/*
Add row for the manually input survey
*/
function addRow() {

  var table = $('#dataTable');

  var rowCount = table[0].rows.length;
  var row = $("#row1").clone();
  var rowFields = row.children();
  var colCount = rowFields.length;

  for(var i=0; i<colCount; i++) {
	var curCell = rowFields[i];
	curCell.children[0].value = "";
	curCell.children[0].name += rowCount;
	if (i==3) {
		$(curCell.children[0]).blur(checkTime_updatePie);
	}
  }
  
  table.append(row[0]);
}
