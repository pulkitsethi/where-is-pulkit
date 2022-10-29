	var WhereIsPulkit = (function(){
		//Variables
		let options = {};			//Configurable options
		let hash_options = null;	//Options stored in the url hash
		let map = {};				//Handle to map
		let current_position = {};	//Keeping track of position
		let previous_city = null;	//Keeping track of last known position
		let path = null;			//Polyline of path
		let positionMarker = null;	//Marker for current position

		const initialize = (options) => {
			//console.log('Initialize');
			if (location.hash) {
				var url_opts = location.hash.slice(1).split(',');

				hash_options = {
					map: {
						zoom: url_opts[0],
						center: {
							lat: url_opts[1],
							lng: url_opts[2]
						}
					}
				};
			}

			//Extend options
			options = $.extend(true, {
				map: {
					id: 'pulkitsethi.map-6rv4q6kw',
					zoom: 4,
					center: {
						lat: 38.60313492038697,
						lng: -97.94665625
					},
					minZoom: 4,
					maxZoom: 16,
					zoomControl: false
				}
			}, hash_options, options);

			//Setup map
			mapboxgl.accessToken = 'pk.eyJ1IjoicHVsa2l0c2V0aGkiLCJhIjoiY3BjU3ltbyJ9.acF-afjaugysxggqIfBR7w';
			const map = new mapboxgl.Map({
				container: 'map',
				style: 'mapbox://styles/mapbox/streets-v11',
				center: [options.map.center.lng, options.map.center.lat],
				zoom: options.map.zoom,
				projection: 'globe' // display the map as a 3D globe
			});

			// Add zoom and rotation controls to the map.
			map.addControl(new mapboxgl.NavigationControl());

			//MAP Event - load
			map.on('style.load', () => {
				//Log
				//console.log('Map loaded');
				map.setFog({}); // Set the default atmosphere style

				//Updating data on map
				updateMap();
			});

			//MAP Event - zoom end
			map.on('zoomend dragend', (e) => {
				let zoom = map.getZoom();
				let latlng = map.getCenter();

				//console.log('Zoomend: ' + zoom);
				//Update URL
				//location.hash = 'z=' + zoom + '&' + 'latlng=' + latlng.lat + ',' + latlng.lng;
				location.hash = zoom + ',' + latlng.lat + ',' + latlng.lng;
			});

			//Socket
			let socket = io.connect(window.location.protocol + "//" + window.location.host);

			//SOCKET.IO - Listening to position updates
			socket.on('position-update', (data) => {
				//console.log(data);
				//console.log('RECEIVED NEW POSITION: ' + data.lat + ', ' + data.long);
				//Cacheing last known position locally to be used by other functions
				current_position.lat = data.lat;
				current_position.long = data.long;

				//Updating marker
				updatePosition(data.lat, data.long);

				//Update City
				updateCity(data.lat, data.long);
			});

		};

		const updateMap = (callback) => {
			//Variables
			let ajaxNotification = {};	//Notification object

			//Get geo data and load into map
            const url = '/api/get/location';
            
			//Get location data
			$.ajax({
				type: "GET",
				url: url,
				dataType: 'json',
				beforeSend: () => {
					ajaxNotification = generateNotification('information', 'center', 'Locating Pulkit...');
				},
				success: (data) => {
					ajaxNotification.close();

					ajaxNotification = generateNotification('success', 'center', 'Pulkit Found!!', '3000');

					drawGeoData(data);
					drawFoursquare();
					drawFlickr();
				},
				complete: () => {
					ajaxNotification.close();
				},
				error: (request, status, error) => {
					generateNotification('error', 'center', 'Can not find Pulkit :( Please try again shortly.');
				}
			});

			if (callback && typeof(callback) === "function") { 
				callback();
			}
		};

		/* Generates Notifcation
		*	type: error, information, success, etc
		*	layout: top, topCenter, topRight, topLeft, etc
		*	text: Text to display
		*	timeout: Time that passes before notification goes away (in milliseconds)
		*/
		const generateNotification = (type, layout, text, timeout) => {
		   		
			   const n = noty({
			   		text: text,
			   		type: type,
			        dismissQueue: true,
			   		layout: layout,
			   		theme: 'defaultTheme',
			   		timeout: timeout
			   });
				
			   //Debugging
			   //console.log('html: '+n.options.id);

			   return n;
		};

		//Displays data on map
		const drawGeoData = (data, callback) => {
			//Debugging
			//console.log('Draw Geo Data');

			let pointList = [];
			const coords = data.locations.coordinates;
			
			//Converting data into LatLng objects
			for(let i = 0; i < coords.length; i++){
				pointList.push(new L.LatLng(coords[i][1], coords[i][0]));

				//Debugging
				//L.circleMarker(new L.LatLng(coords[i][1], coords[i][0])).addTo(map);
			}

			//DRAWING GEOMETRY
			//Creating path polyline
			path = new L.Polyline(pointList, {
				color:  '#FF5300'
				,weight: 2.6
				,opacity: 0.9
				,smoothFactor: 1
				,dashArray: [10,5]
			});

			//Add polyline to map
			path.addTo(map);

			//Creating position marker at last coordinate
			position = pointList[pointList.length-1];

			var positionIcon = L.icon({
			    iconUrl: '/images/driving-car-icon-2.png'
			    , iconSize: [68, 78]
			    , iconAnchor:   [35, 64]
			});

			positionMarker = L.marker(position, {
				icon: positionIcon
				, bounceOnAdd: true
				, zIndexOffset: 249
			});

			positionMarker.addTo(map);

			//UPDATING TEXT
			//Saving position in global variable for other functions (updating city)
			current_position = { 
				lat: position.lat,
		    	lng: position.lng
		    }

		    updateCity();

			//Updating Map view
			if(!hash_options){
		    	map.fitBounds(path.getBounds());//.setMaxBounds(map.getBounds());
			}

			//Overiding original zoom control.  Zoom control will zoom in twice
		    const zoomControl = new L.Control.Zoom();

		    zoomControl._zoomIn = function (e) {
				this._map.zoomIn(e.shiftKey ? 3 : 2);
			};

			zoomControl._zoomOut = function (e) {
				this._map.zoomOut(e.shiftKey ? 3 : 2);
			};

			map.addControl(zoomControl);

			//Adding Max Zoom Controls
			map.addControl(new MaxZoomControl());

		    //MaxZoomControl.addTo(map);

		    //Callback
			if (callback && typeof(callback) === "function") { 
				callback();
			}

		};

		const updatePosition = (lat, long) => {
			const position = new L.LatLng(lat, long);

		    //Add new position
		    path.addLatLng(position);

			positionMarker.setLatLng(position);
		}		

		const updateCity = (lat, lng, callback) => {
			//Debugging
			//console.log('Locating city...');

			//Variables
			let current_lat = null;			//Local scoped lat
			let current_lng = null;			//Local scoped long
			let city_geocode_url = null;	//URL for city geocode service

			//Checks to see if lat and lng where provided, and if not defaults to global lat,lng
			if(lat && lng){
				current_lat = lat;
				current_lng = lng;
			} else{
				//Default to global current position
				current_lat = current_position.lat;
				current_lng = current_position.lng;
			}

			//Geocode API URL
			city_geocode_url = 'http://api.tiles.mapbox.com/v3/pulkitsethi.map-6rv4q6kw/geocode/' + current_lng + ',' + current_lat + '.json';

			$.get(
			    city_geocode_url,
			    function(data) {
					let city = null;	//City returned from API call

			    	$.each(data.results[0], function (index, item){
			       		if(item.type == 'CDP' || item.type == 'city'){
			       			//Debugging
			       			//console.log('City: ' + item.name);

			       			city = item.name;
			       		}
			       	});
                    
                    //Show status bar if not visible
                    var statusBar = $('#status-bar');
                    
                    if(statusBar.is(':hidden')){
                        statusBar.fadeIn(1500);
                    }
                    

                   	//Update page if city has changed
                   	if(city == null){
                        $('#current-city').hide().text('Unknown').fadeIn(1500);
                   	}
			       	else if(city != previous_city){
				       $('#current-city').hide().text(city).fadeIn(1500);
                       
                       previous_city = city;
			       	}   
			    }
			);

			//Callback
			if (callback && typeof(callback) === "function") { 
				callback();
			}
		};

		const drawFoursquare = () => {
            const foursquare_checkin_url = '/api/get/checkins';

			$.get(
				foursquare_checkin_url,
				(data) => {

					$.each(data.response.checkins.items, (index, item) => {
						const lat = item.venue.location.lat;
						const lng = item.venue.location.lng;
                        
                        const icon = item.venue.categories[0].icon;
						const iconUrl = icon.prefix + 'bg_32' + icon.suffix;
                        
                        const venueUrl = 'https://foursquare.com/v/' + item.venue.id;

						const position = new L.LatLng(lat, lng);

						const foursquareIcon = L.AwesomeMarkers.icon({
							icon: 'foursquare', 
							color: 'blue'
						});

						const foursquareMarker = L.marker(position, {
							icon: foursquareIcon
							, riseOnHover: true
							, bounceOnAdd: true
						});
						
						let popupHtml = "<div class='category'> <img src='" + iconUrl + "'/> </div>";
						popupHtml += "<a target='_blank' href='" + venueUrl +"'><div class='venueName'>" + item.venue.name + "</div></a>";

						foursquareMarker
						    .bindPopup(popupHtml, { autoPanPaddingTopLeft: [12, 80], maxWidth: 500, closeButton: false })
          					.on('mouseover', function(e) { this.openPopup(); });
        					//.on('mouseout', function(e) { this.closePopup(); });

        				//Adding marker to map
        				foursquareMarker.addTo(map);

					});
                    
				}
			);
		};

		const drawFlickr = () => {
			var flickr_photos_url = '/api/get/photos';

			$.get(
				flickr_photos_url,
				(data) => {
					
					$.each(data.photoset.photo, function(index, item){
						var lat = item.latitude;
						var lng = item.longitude;
						var photo_url_100_thumbnail = item.url_t;
						var photo_url_320_small = item.url_n;
						var photo_url_800_medium = item.url_c;
						var title = item.title;
                        
                        var imgSource = photo_url_100_thumbnail;
                        var imgHeight = item.height_n;
                        var imgWidth = item.width_n;
                        var imgPageUrl = 'http://www.flickr.com/photos/' + data.photoset.owner + '/' + item.id;

						var position = new L.LatLng(lat, lng);

						var flickrIcon = L.icon({
							 iconSize: [32, 32]
						    , iconAnchor:   [16, 41]
						    , popupAnchor: [0, -51]
						    , className: 'foursquare-marker-icon'
						});

						var cameraMarker = L.AwesomeMarkers.icon({
							icon: 'camera', 
							color: 'pink'
						});

						var flickrMarker = L.marker(position, {
							icon: cameraMarker 
							, riseOnHover: true
							, bounceOnAdd: true
						});

						/*
						var flickrMarker = L.marker(position, {
							icon: flickrIcon
							, riseOnHover: true
							, bounceOnAdd: true
						});
						*/

					    $('.thumbnails').append(
				    		$('<div>', {'class' : 'col-md-4'}).append(
				    			$('<div>', {'class' : 'thumbnail'}).append(
				    				$('<img>', {'id' : title, 
				    							'src' : imgSource, 
				    							'class' : 'img-responsive'})
				    			)
				    		)
				    	);

						var popupHtml = "<div class='popup-img'> <img height='" + imgHeight + "' width='" + imgWidth + "' src=' " + photo_url_320_small + "'/> </div>";
						popupHtml += "<div>" + title + "<a class='pull-right' target='_blank' href='" + imgPageUrl +"'> <span class='glyphicon glyphicon-resize-full'></span>Flickr</a>" + "</div>" ;
                        
						flickrMarker
						    .bindPopup(popupHtml, { autoPanPaddingTopLeft: [12, 80], maxWidth: 500, closeButton: false })
          					.on('mouseover', function(e) { this.openPopup(); });
        					//.on('mouseout', function(e) { this.closePopup(); });
						
        				//Adding marker to map
        				flickrMarker.addTo(map);
                        
					});
					
				}
			);
            

		};

		//Adding custom zoom control
		const MaxZoomControl = L.Control.extend({
		    options: {
		        position: 'topleft'
		    },

		    onAdd: (map) => {
		    	//console.log('Max Zoom Control onAdd')
		        // create the control container with a particular class name
		        var maxZoomName = 'whereispulkit-control-max-zoom', 
		        	container = L.DomUtil.create('div', 'whereispulkit-bar leaflet-bar');

		        // ... initialize other DOM elements, add listeners, etc.
		        this._maxZoomInButton = this._createButton('Max +', 'Max Zoom In', maxZoomName + '-in', container, this._maxZoomIn, this);
		        this._maxZoomOutButton = this._createButton('Max -', 'Max Zoom Out', maxZoomName + '-out', container, this._maxZoomOut, this);

		        map.on('zoomend zoomlevelschange', this._updateDisabled, this);

		        return container;
		    },

		    onRemove: (map) => {
				map.off('zoomend zoomlevelschange', this._updateDisabled, this);
			},

		    _maxZoomIn: (e) => {
		    	var maxZoom = map.getMaxZoom();
				var lat = current_position.lat;
				var lng = current_position.lng;

				map.setView([lat, lng], maxZoom);
		    },

		    _maxZoomOut: (e) => {
		    	var maxZoom = map.getMinZoom();
				var lat = current_position.lat;
				var lng = current_position.lng;

				map.setView([lat, lng], maxZoom);
		    },

			_createButton: (html, title, className, container, fn, context) => {
				var link = L.DomUtil.create('a', className, container);
				link.innerHTML = html;
				link.href = '#';
				link.title = title;

				var stop = L.DomEvent.stopPropagation;

				L.DomEvent
				    .on(link, 'click', stop)
				    .on(link, 'mousedown', stop)
				    .on(link, 'dblclick', stop)
				    .on(link, 'click', L.DomEvent.preventDefault)
				    .on(link, 'click', fn, context);

				return link;
			},

			_updateDisabled: () => {
				const map = this._map,
					className = 'leaflet-disabled';

				L.DomUtil.removeClass(this._maxZoomInButton, className);
				L.DomUtil.removeClass(this._maxZoomOutButton, className);

				if (map._zoom === map.getMinZoom()) {
					L.DomUtil.addClass(this._maxZoomOutButton, className);
				}
				if (map._zoom === map.getMaxZoom()) {
					L.DomUtil.addClass(this._maxZoomInButton, className);
				}
			}
		});
 
		return {
			init: initialize
		};

	}());
