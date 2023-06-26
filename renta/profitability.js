// creating a namespace by using an "immediately-invoked function expression"
// all variables and functions are private to the namespace except the ones made public in the return function at the bottom
var profitability = (function(){

	var tangleExternal;
	var timeThreshold = 150;
	var breakEvenFixedAndTracker = 0;
	var breakEvenFixedLargeAndTracker = 0;
	var breakEven;

	var gainAtLocations = [];
	gainAtLocations["Flensburg"] = 830;
	gainAtLocations["Karlsruhe"] = 950;
	gainAtLocations["Oberstdorf"] = 1050;
	gainAtLocations["Mojave-Wüste"] = 2100;

	function setUpTangle() {
		var element = document.getElementById("inputValues");
		tangleExternal = new Tangle(element, {
			initialize : function() {
				////
				this.installedKW = 20;
				//this.foo = this.installedKW;
				this.modulePricePerW = 1.2;
	
				this.fixedCostPerW = 0.20;
				this.trackerCostPerW = 1.20;
	
				this.gainInKWH = gainAtLocations["Flensburg"];
				this.compensationPerKWH = 0.29;
				this.trackerAddedGain = 30;
	
				this.fixedMaintenanceCost = 0.5;
				this.trackerMaintenanceCost = 1.0;
				////
	
				this.trackerGainFactor = 0;
				this.trackerAdditionalGain = 0;
	
				this.fixedCost = 0;
				this.trackerCost = 0;
				
				this.gainPerYearFixed = 0;
				this.gainPerYearTracker = 0;
				
				this.profitPerYearFixed = 0;
				this.profitPerYearTracker = 0;
				
				this.profitPerYearFixedLarge = 0;
				
				this.timeSpan = 20;
				
				exportTangle(this);
			},
			update : function() {
				this.trackerGainFactor = 1 + (this.trackerAddedGain / 100);
				
				this.costFixed =		this.installedKW * 1000 * (this.modulePricePerW + this.fixedCostPerW);
				this.costFixedLarge =	this.installedKW * 1000 * (this.modulePricePerW + this.fixedCostPerW) * this.trackerGainFactor;
				this.costTracker =		this.installedKW * 1000 * (this.modulePricePerW + this.trackerCostPerW);
				
				this.gainPerYearFixed =			this.installedKW * this.gainInKWH;
				this.gainPerYearFixedLarge =	this.installedKW * this.gainInKWH * this.trackerGainFactor;
				this.gainPerYearTracker =		this.installedKW * this.gainInKWH * this.trackerGainFactor;
	
				this.trackerAdditionalGain = this.gainPerYearTracker - this.gainPerYearFixed;
				
				this.profitPerYearFixed = 		this.gainPerYearFixed   * this.compensationPerKWH 	- (this.costFixed   * (this.fixedMaintenanceCost / 100));
				this.profitPerYearFixedLarge = (this.gainPerYearFixed   * this.compensationPerKWH   - (this.costFixed   * (this.fixedMaintenanceCost / 100))) * this.trackerGainFactor; 
				this.profitPerYearTracker = 	this.gainPerYearTracker * this.compensationPerKWH	- (this.costTracker * (this.trackerMaintenanceCost / 100));
	
				breakEven = (this.costTracker - this.costFixed) / (this.profitPerYearTracker - this.profitPerYearFixed);
				breakEvenFixedAndTracker = breakEven.toFixed(2);
				jQuery("#breakEvenFixedAndTracker").text(checkBreakEvenPoint(breakEvenFixedAndTracker, timeThreshold));
				
				breakEven = (this.costTracker - this.costFixedLarge) / (this.profitPerYearTracker - this.profitPerYearFixedLarge);
				breakEvenFixedLargeAndTracker = breakEven.toFixed(2);
				jQuery("#breakEvenFixedLargeAndTracker").text(checkBreakEvenPoint(breakEvenFixedLargeAndTracker, timeThreshold));
	
				
				jQuery("#firstProfitFixed").text(
					checkProfitability((this.costFixed 		/ this.profitPerYearFixed))
				);
	
				jQuery("#firstProfitFixedLarge").text(
					checkProfitability((this.costFixedLarge / this.profitPerYearFixedLarge))
				);
	
				jQuery("#firstProfitTracker").text(
					checkProfitability((this.costTracker 	/ this.profitPerYearTracker))
				);
				exportTangle(this);
				renderChart();
			}
		});
	}

	function updateGain(value){
		tangleExternal.setValue("gainInKWH", gainAtLocations[value]);
	}

	function checkProfitability(value){
		if (value <= 0 || value == Infinity){
			value = "nie";
		}
		return Tangle.formats.localizedFloat(value);
	}

	function checkBreakEvenPoint(value, threshold) {
		if (value < 0) {
			return "nie";
		}
		else {
			if (value > threshold) {
				return threshold + "+ Jahre";
			}
			else {
				return value + " Jahre";
			}
		}
	}

	var myTangle
	function exportTangle(t){
		myTangle = t;
	}

	function renderChart() {
		jQuery.plot(jQuery("#chart"),
			//data
			[
				{
					label: "Fix-System",
					data: getFixedValues()
				},
				{
					label: "Fix-System, größere Fläche",
					data: getFixedLargeValues()
				},
				{
					label: "Tracker-System",
					data: getTrackerValues()
				},
				{
					label: "Schnittpunkt Tracker / Fix",
					data: getBreaEvenValuesTrackerFix(),
					points : {radius: 6}
				},
				{
					label: "Schnittpunkt Tracker / Fix groß",
					data: getBreakEvenValuesTrackerFixLarge(),
					points : {radius: 6}
				}
			],
			//options
			{
				series: {
					lines: { show: true, lineWidth: 1 },
					points: { show: true },
					shadowSize: 0,
				},
				legend: {
					//margin: [0, -200],
					position: "nw",
					//noColumns: 5,
					//container: jQuery("#legendContainer")
				},
				grid: {
					hoverable: true,
					clickable: true
				},
				xaxis: {
					axisLabel: 'Jahre'
				},
				yaxis: {
					axisLabel: 'Kosten/Profit',
					axisLabelUseCanvas: true,
					axisLabelFontSizePixels: 14,
					axisLabelFontFamily: 'sans-serif'
				}
			});
		
		function showTooltip(x, y, contents) {
			$('<div id="tooltip">' + contents + '</div>').css( {
				position: 'absolute',
				display: 'none',
				top: y + 5 - 25,
				left: x + 5,
				border: '1px solid #fdd',
				padding: '2px',
				'background-color': '#fee',
				opacity: 0.80
			}).appendTo("body").fadeIn(200);
		};
		
		//var previousPoint = null;
		$("#chart").bind("plothover", function (event, pos, item) {
			if (item) {
					$("#tooltip").remove();
					var x = item.datapoint[0].toFixed(2),
						y = item.datapoint[1].toFixed(2);
	
					showTooltip(item.pageX, item.pageY, item.series.label + "; " + ("Jahr " + x)+ ", " + ("Profit: " + y));
			}
			else {
				$("#tooltip").remove();
				//previousPoint = null;            
			}
		});
	}

	function getBreaEvenValuesTrackerFix(){
		if (breakEvenFixedAndTracker > 0 && breakEvenFixedAndTracker < myTangle.timeSpan){
			return [[
				breakEvenFixedAndTracker,
				(breakEvenFixedAndTracker * myTangle.profitPerYearTracker) - myTangle.costTracker
			]];
		}
	}

	function getBreakEvenValuesTrackerFixLarge(){
		if (breakEvenFixedLargeAndTracker > 0 && breakEvenFixedLargeAndTracker < myTangle.timeSpan){
			return [[
				breakEvenFixedLargeAndTracker,
				(breakEvenFixedLargeAndTracker * myTangle.profitPerYearTracker) - myTangle.costTracker]];
		}
		
	}

	function getFixedValues(){
		var fixedValues = new Array;
		for (var i = 0; i <= myTangle.timeSpan; i++){
			fixedValues.push(
				[i, (i * myTangle.profitPerYearFixed) - myTangle.costFixed]
			);
		}
		return fixedValues;
	}

	function getFixedLargeValues(){
		var fixedValues = new Array;
		for (var i = 0; i <= myTangle.timeSpan; i++){
			fixedValues.push(
				[i, (i * myTangle.profitPerYearFixedLarge) - myTangle.costFixedLarge]
			);
		}
		return fixedValues;
	}

	function getTrackerValues(){
		var trackerValues = new Array;
		for (var i = 0; i <= myTangle.timeSpan; i++){
			trackerValues.push(
				[i, (i * myTangle.profitPerYearTracker) - myTangle.costTracker]
			);
		}
		return trackerValues;
	}

	// things here are declared public
	return{
		setUpTangle: setUpTangle,
		updateGain: updateGain
	}

})();
Tangle.formats.localizedFloat = function (value) {
     var s=sprintf("%.0f",value);
	 return s.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1.");
}