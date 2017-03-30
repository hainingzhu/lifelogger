var rowId = 10;
var pie = {"Work": 0, "Leisure": 0, "Personal maintenance": 0, "Other": 24*60};



$('document').ready(function(){
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
});

function refreshPage() {
	$("#submit_date").val(getDate("-", 0));
}


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
