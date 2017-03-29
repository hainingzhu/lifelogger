var moves;
var rescuetime;
var fitbit;
var focus = 0;
var rowId = 10;
var pie = {"Work": 0, "Leisure": 0, "Personal maintenance": 0, "Other": 24*60};
var pastweek;

$('document').ready(function(){
	// setup the date time picker.
    $( "#datepicker" ).datepicker({
		dateFormat: "DD, d MM, yy",
		onSelect: function(selected, evnt) {
			refreshPage();
		}
	});
	$("#datepicker").datepicker("setDate", new Date());
	refreshPage();
	$("input[type='time'][name^='time_end']").each(function(idx, ele) {
		$(ele).blur(checkTime_updatePie);
	});
	updatePieChart();
	$("input[name='time_began']").val("00:00");
});


function refreshPage() {
	get_moves_places();
	get_rescutime_timechart();
	get_fitbit_timechart();
	pastWeek_timeSeries();
	pastweek_survey_timeSeries();
	$("#submit_date").val(getDate("-", 0));
}

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

offset is the number of days to offset by today. 
0 - today
-1 is yesterday
1 is tomorrow
*/
function getDate(delimiter, offset) {
	var d = $("#datepicker").datepicker("getDate");
	d.setDate(d.getDate() + offset);
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
	var dateStr = getDate("", 0);
	$.ajax({
		url: SCRIPT_ROOT + "/moves_places/" + dateStr,
		dataType: "json"
	}).done(function(data) {
		moves = data;
		moves_bar = [];
		
		var colorSet = ["#23FFC8", "#20E2E8", "#30C2FF", "#2079E8", "#234BFF", "#246678", "#98EAEA", "#3DA832",  "#45CCFF", "#ABDD32"];
		var dict_loc_color = {};
		var dict_len = 0;
		for (var i = 0; i < moves.length; i++) {
			if (moves[i][0] < moves[i][1]) {
				var color_idx;
				if (moves[i][2] in dict_loc_color) {
					color_idx = dict_loc_color[moves[i][2]];
				} else {
					dict_loc_color[moves[i][2]] = dict_len;
					color_idx = dict_len;
					dict_len += 1;
				}
				moves_bar.push({
				    x : 1,
				    y : [moves[i][0], moves[i][1]],
				    loc: moves[i][2],
   				    indexLabelFormatter : function (e) {
					    return formatHour_24to12(e.dataPoint.y[1-e.index]);
				    },
				    indexLabelPlacement : 'inside',
					color: colorSet[color_idx]
				});
			}
		}
		var chart = new CanvasJS.Chart("moveschart", {
			title: {
				text: "Moves -- Locations"
			},
			dataPointWidth: 200,
			axisY: {
				title: "Time by Hour",
				minimum: 0,
				maximum: 23,
				interval: 1,
				reversed: true,
				labelFormatter: function (e) {
				    return formatHour_24to12(e.value);
				}
			},
			axisX: {
				title: "Location",
				minimum: 0.1,
				maximum: 1.9,
				interval: 1
			},
		    toolTip: {
			content: "{loc}"
		    },
			data: [
			{
				type: "rangeColumn",
				showInLegend: false,
				dataPoints: moves_bar,
				indexLabelFontColor: "black",
				indexLabelFontSize: 10//,
				//color: "#a4ef83"
			}
			]
		});
		chart.render();
	});
}


function formatHour_24to12(i) {
    var time_surfix;
    if (i>=12) {
	time_surfix = "pm";
    } else {
	time_surfix = "am";
    }
    var lb = i%12;
    if (i == 12)
	lb = 12;
    return lb + ":00 " + time_surfix;
}


function get_rescutime_timechart() {
	var dateStr = getDate("-", 0);
	$.ajax({
		url: SCRIPT_ROOT + "/rescuetime_timechart/" + dateStr,
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
			    label: formatHour_24to12(i)
			};
			distractingPoints[i] = {
				y: data[i]['distracting'],
			    label: formatHour_24to12(i)
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
	var dateStr = getDate('-', 0);
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



function pastWeek_timeSeries() {	
	rb = getDate("-", -6);
	re = getDate("-", 0);
	$.ajax({
		url: SCRIPT_ROOT + "/pastweek",
		data: {
			startDate: rb,
			endDate: re
		},
		dataType: "json"
	}).done(function(data) {
		pastweek = data;
		productive_ts = [];
		distractive_ts = [];
		for (var i = 0; i < data.dateLabels.length; i++) {
			productive_ts.push({
				x: new Date(data.dateLabels[i]),
				y: data.timeSeries[i][0]
			});
			
			distractive_ts.push({
				x: new Date(data.dateLabels[i]),
				y: data.timeSeries[i][1]
			});
		}
		var chart = new CanvasJS.Chart("pastweek", {
			title: {
				text: "Past 7 days' productivity from Rescuetime"
			},legend: {
				horizontalAlign: "center",
				verticalAlign: "bottom",
				fontSize: 15,
				fontFamily: "Lucida Sans Unicode"
			},
			axisX: {
				title: "Date",
				valueFormatString: "DDD"
			},
			axisY: {
				title: 'Time (minutes)'
			},
			data: [
			{
				type: "line",
				showInLegend: true,
				lineThickness:3,
				legendText: "Productive Time",
				color:"#5DADE2",
				dataPoints: productive_ts,
			}, {
				type: "line",
				showInLegend: true,
				lineThickness:3,
				legendText: "Distractive Time",
				color:"#EF1903",
				dataPoints: distractive_ts,
			}
			]
		});
		chart.render();
	});
}



function pastweek_survey_timeSeries() {
	rb = getDate("-", -6);
	re = getDate("-", 0);
	$.ajax({
		url: SCRIPT_ROOT + "/pastweek_survey",
		data: {
			startDate: rb,
			endDate: re
		},
		dataType: "json"
	}).done(function(data) {
		pastweek = data;
		console.log(pastweek);
		academic_ts = [];
		social_ts = [];
		personal_ts = [];
		for (var i = 0; i < data.dateLabels.length; i++) {
			academic_ts.push({
				x: new Date(data.dateLabels[i]),
				y: data.timeSeries[i][0]
			});
			
			social_ts.push({
				x: new Date(data.dateLabels[i]),
				y: data.timeSeries[i][1]
			});
			
			personal_ts.push({
				x: new Date(data.dateLabels[i]),
				y: data.timeSeries[i][2]
			});
		}
		var chart = new CanvasJS.Chart("pastweek-survey", {
			title: {
				text: "Past 7 days' percentage of time spent"
			},legend: {
				horizontalAlign: "center",
				verticalAlign: "bottom",
				fontSize: 15,
				fontFamily: "Lucida Sans Unicode"
			},
			axisX: {
				title: "Date",
				valueFormatString: "DDD"
			},
			axisY: {
				title: 'Percentage (x100%)'
			},
			data: [
			{
				type: "line",
				showInLegend: true,
				lineThickness:3,
				legendText: "Work",
				color:"#5DADE2",
				dataPoints: academic_ts,
			}, {
				type: "line",
				showInLegend: true,
				lineThickness:3,
				legendText: "Leisure",
				color:"#EF1903",
				dataPoints: social_ts,
			}, {
				type: "line",
				showInLegend: true,
				lineThickness:3,
				legendText: "Personal maintenance",
				color: "#4B0082",
				dataPoints: personal_ts,
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
