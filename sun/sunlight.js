var sunlight = (function(){
/*
 * 
 * interaction
 * 
 */
	var tangleExternal;
	Date.prototype.getDOY = function() {
		var onejan = new Date(this.getFullYear(), 0, 1);
		return Math.ceil((this - onejan) / 86400000);
	}

	function exportTangle(t){
		tangleInternal = t;
	}
	
	function Location(name, lat, lon, offset){
		this.name = name;
		this.lon = lon;
		this.lat = lat;
		this.utcOffset = offset;
	}
	
	var locations = new Array();
	locations["Leipzig"] = new Location("Leipzig", 50, 12, 1);
	locations["Lissabon"] = new Location("Lissabon", 40, 9, 0);
	locations["Khartoum"] = new Location("Khartoum", 15, 32, 3);
	
	var selectedLocation = "Leipzig";
	function setLocation(location){
		selectedLocation = location;
		tangleExternal.setValue("lat", locations[selectedLocation].lat);
		tangleExternal.setValue("lon", locations[selectedLocation].lon);
		tangleExternal.setValue("delta_gmt", locations[selectedLocation].utcOffset);
		updateData();
	}

	function setUpTangle() {
		var element = document.getElementById("example");
		tangleExternal = new Tangle(element, {
			initialize : function() {
				this.lat = locations[selectedLocation].lat;
				this.lon = locations[selectedLocation].lon;
				this.height = 0.0;
				var date = new Date();
				this.day_of_year = date.getDOY();
				this.hour = date.getHours();
				this.minute = date.getMinutes();
				this.delta_gmt = this.hour - date.getUTCHours();
				this.module_azimuth = 180;
				this.module_tilt = 45;
	
				this.sun_azimuth = 0;
				this.sun_elevation = 0;
				this.sun_declination = 0;
				this.air_mass = 0;
				this.sunrise = 0;
				this.sunriseMinutes = 0;
				this.sunset = 0;
				this.sunsetMinutes = 0;
				this.s_incident = 0;
				this.s_module = 0;
				
				exportTangle(this);
			},
			update : function() {				
				var lstm = sun.lstm(this.delta_gmt);
				var eot = sun.equation_of_time(this.day_of_year);
				var tc = sun.tc(this.lon, lstm, eot);
				var time_in_minutes = (this.hour * 60 ) + this.minute;
				var lst = time_in_minutes + tc;
				var hra = sun.hra(lst / 60);
	
				this.sun_declination = sun.declination(this.day_of_year);
				this.sun_elevation = sun.elevation(this.lat, this.sun_declination, hra);
				this.sun_azimuth = sun.azimuth(this.lat, this.sun_declination, hra);
				this.sunriseMinutes = sun.sunrise(this.lat, this.sun_declination, tc);
				this.sunrise = sun.t2s(this.sunriseMinutes);
				this.sunsetMinutes = sun.sunset(this.lat, this.sun_declination, tc);
				this.sunset = sun.t2s(this.sunsetMinutes);
				this.air_mass = sun.air_mass(90 - this.sun_elevation);
				this.s_incident = sun.direct_intensity(this.air_mass, this.height);
				this.s_module = Math.max(0, sun.solar_radiation(this.sun_elevation, this.sun_azimuth, this.s_incident, this.module_tilt, this.module_azimuth));
				
				exportTangle(this); // TODO eliminate this hack!
				updateData();
			},
			calculatePower : function(time_in_minutes) {
				if(	time_in_minutes < this.sunriseMinutes ||
					time_in_minutes > this.sunsetMinutes){
					var	r = new Object();
					r.module = 0;
					r.incident = 0;
					return r; 
				}
				
				var lstm = sun.lstm(this.delta_gmt);
				var eot = sun.equation_of_time(this.day_of_year);
				var tc = sun.tc(this.lon, lstm, eot);
				var lst = time_in_minutes + tc;
				var hra = sun.hra(lst / 60);
	
				var sun_declination = sun.declination(this.day_of_year);
				var sun_elevation = sun.elevation(this.lat, sun_declination, hra);
				var sun_azimuth = sun.azimuth(this.lat, sun_declination, hra);
				
				var air_mass = sun.air_mass(90 - sun_elevation);
				var s_incident = sun.direct_intensity(air_mass, this.height);
				var s_module = Math.max(0, sun.solar_radiation(sun_elevation, sun_azimuth, s_incident, this.module_tilt, this.module_azimuth));
				
				var	result = new Object();
				result.module = (isNaN(s_module)?0:s_module);
				result.incident = (isNaN(s_incident)?0:s_incident);			
				return result;
			}
		});
	}

/*
 * 
 * chart
 * 
 */

	const HEIGHT_TO_WIDTH_RATIO = 0.75;
	const DATA_RESOLUTION = 100;
	const MAXIMUM_DATA = 1.1;
	const PLACEHOLDER_LEFT = 50;
    const PLACEHOLDER_BOTTOM = 20;
//var tangle;
	var root = d3.select("#chart");
	var data = new Array(DATA_RESOLUTION);
	var dataIncident = new Array(DATA_RESOLUTION);
	var x,y;
	var movingRulers = true;
	for(var i = 0; i < DATA_RESOLUTION; i++){
		data[i] = 0;
	};

	function setUpChart(){
		/*
		 * 	root
		 * 		graphRoot
		 * 			graphGroup
		 * 
		 */
		var container = d3.select("#chart");
		const WIDTH = parseInt(container.style("width"));
		const HEIGHT = WIDTH * HEIGHT_TO_WIDTH_RATIO;
		
		updateData();
		
		root = d3.select("#chart")
			.append("svg:svg")
				.attr("class", "chart")
				.attr("height", HEIGHT)
				.attr("width", WIDTH);
		
		// background
		root.append("svg:rect")
			.attr("class", "background")
			.attr("width", WIDTH)
			.attr("height", HEIGHT);
		
		var graphRoot = root.append("svg:g")
							.attr("id", "graphRoot")
							.attr("transform", "translate(" + PLACEHOLDER_LEFT + ", " + -PLACEHOLDER_BOTTOM + ")");

		// create a group to move the graph around		
		groupHeight = HEIGHT - PLACEHOLDER_BOTTOM;
		groupWidth = WIDTH - PLACEHOLDER_LEFT;

		var graphGroup = graphRoot.append("svg:g")
							.attr("id", "graphGroup")
							.attr("height", groupHeight)
							.attr("width", groupWidth);
		
		// add a graph
		x = d3.scale.linear()
				.domain([0, data.length])
				.range([0, WIDTH - PLACEHOLDER_LEFT]);
		y = d3.scale.linear()
				.domain([0, MAXIMUM_DATA])
				.range([HEIGHT - PLACEHOLDER_BOTTOM, 0]);

		graphGroup.selectAll("moduleGraph")
			.data([data])
			.enter()
				.append("svg:path")
				.attr("class","moduleGraph")
				.attr("d", d3.svg.line()
					.x(function(d, i){return x(i)})
					.y(function(d, i){return y(d)})
					.interpolate("basis")
				)
		graphGroup.selectAll("indicentGraph")
			.data([dataIncident])
			.enter()
				.append("svg:path")
				.attr("class","incidentGraph")
				.attr("d", d3.svg.line()
					.x(function(d, i){return x(i)})
					.y(function(d, i){return y(d)})
					.interpolate("basis")
				)

		// draw the axes
		// x-axis
		startDate = new Date(2000, 0, 0, 0, 0, 0);
		endDate = new Date(2000, 0, 0, 23, 59, 59);
		format = d3.time.format("%H:%M");
		var xTime = d3.time.scale()
						.range([0, groupWidth])
						.domain([startDate, endDate]);
										
										// put x in here to get the old axis back
		var  xAxis = d3.svg.axis().scale(xTime)
						.tickSize(5)
						.tickFormat(format)
						.ticks(d3.time.hours, 3)
						.tickSubdivide(true);

	    graphGroup.append("svg:g")
	    	.attr("id", "xAxis")
			.attr("class", "axis")
			.attr("transform", "translate(0," + groupHeight + ")")
			.call(xAxis);
			 
		// y-axis
		var yAxis = d3.svg.axis().scale(y)
						.tickSize(5)
						.ticks(10)
						.orient("left");

		graphGroup.append("svg:g")
			.attr("id", "yAxis")
			.attr("class", "axis")
			.call(yAxis);

		// label
		graphRoot.append("svg:text")
			.attr("class", "label")
			.attr("x", -groupHeight/2)
			.attr("y", -35)
			.attr("text-anchor", "end")
			.attr("transform","rotate(270)")
			.text("kW");
		
		graphRoot.append("svg:text")
			.attr("class", "label")
			.attr("x", groupWidth/2)
			.attr("y", HEIGHT + PLACEHOLDER_BOTTOM - 5)
			.attr("text-anchor", "end")
			.text("Zeit");
		
		// overlay
		var overlayGroup = graphGroup.append("svg:g")
							.attr("id", "overlayGroup");
							
		var overlay = overlayGroup.append("svg:rect")
						.attr("width", groupWidth)
						.attr("height", groupHeight)
						//.attr("fill", d3.rgb(0, 255, 0))
						//.attr("fill-opacity", 0.2)
						.attr("fill-opacity", 0.0)
						.on("click", function(){
								movingRulers = !movingRulers;
							}
						)
						.on("mousemove", function(){
							if(movingRulers == true){
								overlayGroup.selectAll(".ruler").remove();
								var position = d3.svg.mouse(this);
								var xPosition = x.invert(position[0]);
								var xPositionRounded = Math.floor(xPosition);
								var interpolator = d3.interpolateNumber(data[xPositionRounded], data[xPositionRounded + 1]);
								var yPosition = interpolator(xPosition - xPositionRounded);
								
								overlayGroup.append("svg:line")
												.attr("id", "verticalRuler")
												.attr("class", "ruler")
												.attr("x1", position[0])
												.attr("y1", groupHeight)
												.attr("x2", position[0])
												.attr("y2", y(yPosition))
												.on("click", function(){
														movingRulers = !movingRulers;
													}
												);

								overlayGroup.append("svg:line")
												.attr("id", "horizontalRuler")
												.attr("class", "ruler")
												.attr("x1", 0)
												.attr("y1", y(yPosition))
												.attr("x2", position[0])
												.attr("y2", y(yPosition))
												.on("click", function(){
														movingRulers = !movingRulers;
													}
												);
								}
							}
						);
	}

	function redraw(){
		root.selectAll(".moduleGraph")
			.data([data])
				.transition()
				.duration(500)
					.attr("d", d3.svg.line()
						.x(function(d, i){return x(i)})
						.y(function(d, i){return y(d)})
						.interpolate("basis")
					);

		root.selectAll(".incidentGraph")
			.data([dataIncident])
				.transition()
				.duration(500)
					.attr("d", d3.svg.line()
						.x(function(d, i){return x(i)})
						.y(function(d, i){return y(d)})
						.interpolate("basis")
					);					
	}

	function updateData(){
		var minutes_per_day = 24*60;
		var minutes_per_slice = minutes_per_day / DATA_RESOLUTION;
		for(var i = 0; i < DATA_RESOLUTION; i++){
		    var power = tangleInternal.calculatePower(minutes_per_slice * i, 0);
			data[i] = power.module;
			dataIncident[i] = power.incident;
		};
		redraw();
	}

	// public stuff
	return{
		setLocation: setLocation,
		setUpTangle: setUpTangle,
		setUpChart: setUpChart
	}

})();