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
			map = new mapboxgl.Map({
				container: 'map',
				style: 'mapbox://styles/mapbox/streets-v11',
				center: [options.map.center.lng, options.map.center.lat],
				zoom: options.map.zoom,
			});

			// Add zoom and rotation controls to the map.
			map.addControl(new mapboxgl.NavigationControl());

			map.on('style.load', () => {
				//Updating data on map
				updateMap();
			});

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

		const updateMap = () => {
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

					drawTravelPath(data);
					//drawFoursquare();
					//drawFlickr();
				},
				complete: () => {
					ajaxNotification.close();
				},
				error: (request, status, error) => {
					generateNotification('error', 'center', 'Can not find Pulkit :( Please try again shortly.');
				}
			});

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
		const drawTravelPath = (points) => {

			map.addSource('route', {
				'type': 'geojson',
				'data': {
					'type': 'Feature',
					'properties': {},
					'geometry': {
						'type': 'LineString',
						'coordinates': points
					}
				}
			});

			map.addLayer({
				'id': 'route',
				'type': 'line',
				'source': 'route',
				'layout': {
					'line-join': 'round',
					'line-cap': 'round'
				},
				'paint': {
					'line-color': '#FF5300',
					'line-width': 2.6,
					'line-dasharray': [10,5]
				}
			});

			map.loadImage(
				'/images/driving-car-icon-2.png',
				(error, image) => {
					if (error) throw error;
	
					// Add the image to the map style.
					map.addImage('driving-car-head', image);
	
					// Add a data source containing one point feature.
					map.addSource('point', {
						'type': 'geojson',
						'data': {
							'type': 'FeatureCollection',
							'features': [
								{
									'type': 'Feature',
									'geometry': {
										'type': 'Point',
										'coordinates': points[points.length-1]
									}
								}
							]
						}
					});
	
					// Add a layer to use the image to represent the data.
					map.addLayer({
						'id': 'points',
						'type': 'symbol',
						'source': 'point', // reference the data source
						'layout': {
							'icon-image': 'driving-car-head', // reference the image
							'icon-size': 0.75
						}
					});
				}
			);

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
 
		return {
			init: initialize
		};

	}());
