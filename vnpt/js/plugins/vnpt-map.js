define(['jquery', 'backbone', 'underscore','async!https://maps.googleapis.com/maps/api/js?key=AIzaSyBYh47nfgrO6fz3FMv0OhryKqc42rMh0TQ'], function($, backbone, _) {
	// private method
	function getgoogleLatLng() {
		
	}
	// Object Main Map
	const vnptMap = {};
	vnptMap.Location = Backbone.Model.extend({
		constructor: function() {
			_.bindAll(this, 'select', 'deselect', 'toggleSelect', 'getLatLng');
			this.defaults = _.extend({}, {
				lat: 0,
				lng: 0,
				selected: false,
				title: ""
			}, this.defaults);
			Backbone.Model.prototype.constructor.apply(this, arguments);
			// Trigger 'selected' and 'deselected' events
			this.on("change:selected", function(model, isSelected) {
				var topic = isSelected ? "selected" : "deselected";
				this.trigger(topic, this);
			}, this);
		},
		select: function() {
			this.set('selected', true)
		},
		deselect: function() {
			this.set('selected', false)
		},
		toggleSelect: function() {
			this.set('selected', !this.get('selected'))
		},
		getLatLng: function() {
			if (google && google.maps && google.maps.LatLng) {
				return this.getLatlng()
			}
		},
		getLatlng: function(){
			return new google.maps.LatLng(this.get("lat"), this.get("lng"))
		}
	})
	vnptMap.LocationCollection = Backbone.Collection.extend({
		constructor: function(opt_models, opt_options) {
			var options = _.defaults({}, opt_options, {
				model: vnptMap.Location
			});
			// Set default model
			options.model || (options.model = GoogleMaps.Location);
			Backbone.Collection.prototype.constructor.call(this, opt_models, options);
			// Deselect other models on model select
			// ie. Only a single model can be selected in a collection
			this.on("change:selected", function(selectedModel, isSelected) {
				if (isSelected) {
					this.each(function(model) {
						if (selectedModel.cid !== model.cid) {
							model.deselect();
						}
					});
				}
			}, this);
		}
	});

	vnptMap.MapView = Backbone.View.extend({
		constructor: function(options){
			_.bindAll(this, 'render', 'close');

			this.mapEvents = this.mapEvents || {};
			this.overlayOptions = this.overlayOptions || {};

			Backbone.View.prototype.constructor.apply(this, arguments);

			this.options = options;

			if(!google || !google.maps) throw new Error('Cannot load Google Map');
			if(!this.map && !this.options.map) throw new Error('Map required');

			this.gOverlay = this.map = this.options.map || this.map;

			_.extend(this.overlayOptions, this.options.overlayOptions);
		},
		bindMapEvents : function(mapEvents, op_context ){
			const context = op_context || this;
			var mapEvents = mapEvents || this.mapEvents;

			_.each(mapEvents, function(handleRef, topic){
				var handle = this._getHandelFromReference(handleRef);
				this._addGoogleMapListener(topic, handle, context);
			}, this);

		},
		_getHandelFromReference: function(handleRef){
			const handle = _.isString(handleRef)? this[handleRef]: handleRef;
			if(!_.isFunction(handle)){
				throw new Error(`Unable bind event ${handle} is not Function`)
			}
			return handle;
		},
		_addGoogleMapListener: function(topic, handle, context) {
			if (context) {
				handle = _.bind(handle, context);
			}
			google.maps.event.addListener(this.gOverlay, topic, handle);
		},
		render: function(){
			this.trigger('before:render');
			if(this.beforeRender){
				this.beforeRender();
			}
			this.bindMapEvents();
			this.trigger('render');
			if(this.onRender) {
				this.onRender();
			}

			return this;
		},
		close: function() {
			this.trigger('before:close');
			if(this.beforeClose){
				this.beforeClose();
			}

			google.maps.events.clearInstanceListeners(this.gOverlay);

			if (this.gOverlay.map) {
				this.gOverlay.setMap(null);
			}

			this.gOverlay = null;

			this.trigger('before:close');
			if(this.beforeClose){
				this.beforeClose();
			}
		}
	});

	vnptMap.InfoWindow = vnptMap.MapView.extend({
		constructor: function(options){
			vnptMap.MapView.prototype.constructor.apply(this, arguments);
			_.bindAll(this,'render','close');

			if(!this.options.marker && !this.maker) throw new Error('Makers not Null');
			this.marker = this.options.maker;

			this.template = this.template || this.options.template || '';
		},
		render: function(){
			this.trigger('before:render');
			if (this.beforeRender) {
				this.beforeRender();
			}
			vnptMap.MapView.prototype.render.apply(this, arguments);

			const tmpl = (this.template) ? $(this.template).html(): '<h2><%= title %></h2>';
			this.$el.html(_.template(tmpl, this.model.toJSON()));

			this.gOverlay = new google.maps.InfoWindow(_.extend({
				content: this.$el[0]
			},this.overlayOptions));

			this.gOverlay.open(this.map, this.marker);

			this.trigger('render');

			if(this.onRender){
				this.onRender();
			}
			return this;
		},
		close: function(){
			this.trigger('before:close');
			if (this.beforeRender) {
				this.beforeRender();
			}
			vnptMap.MapView.prototype.render.apply(this, arguments);

			this.trigger('close');
			if (this.onClose) {
				this.onClose();
			}
			return this;
		}
	});

	vnptMap.MarkerView = vnptMap.MapView.extend({
		constructor: function(){
			this.infoWindow = this.infoWindow || vnptMap.InfoWindow;

			vnptMap.MapView.prototype.constructor.apply(this, arguments);

			_.bindAll(this,'render','close','openDetail','closeDetail','toggleSelect');

			if (!this.model) {
				throw new Error('Model is required!!!');
			}

			this.gOverlay = new google.maps.Marker(_.extend({
				position: this.model.getLatLng(),
				map: this.map,
				title: this.model.title,
				animation: google.maps.Animation.DROP,
				visible: false
			}, this.overlayOptions));

			_.extend(this.mapEvents, {
				'click': 'toggleSelect'
			});

			this.model.on('change:selected',function(model, isSelected) {
				if(isSelected){
					this.openDetail();
				}else {
					this.closeDetail();
				}
			}, this);

			this.model.on('change:lat change:lng', this.refreshOverlay, this);
			this.bindMapEvents({
				'position_changed': this.model.getLatLng()
			})
		},
		refreshOverlay: function(){
			if(!this.model.getLatLng.equals(this.gOverlay.getPosition())){
				this.gOverlay.setOptions({
					position: this.model.getLatLng()
				})
			}
		},
		updateModelPosition: function(){
			const newPosition = this.gOverlay.getPosition();
			if(this.model.getLatLng.equals(newPosition)){
				this.model.set({
					lat: newPosition.lat(),
					lng: newPosition.lng()
				})
			}
		},
		toggleSelect: function(){
			this.model.toggleSelect();
		},
		render: function() {
			this.trigger('before:render');
			if (this.beforeRender) {
				this.beforeRender();
			}
			vnptMap.MapView.prototype.render.apply(this, arguments);
			this.gOverlay.setVisible(true);

			this.trigger('render');
			if(this.onRender){
				this.onRender();
			}
			return this;
		},
		close: function(){
			this.trigger('before:close');
			if (this.beforeClose) {
				this.beforeClose();
			}
			this.closeDetail();
			vnptMap.MapView.prototype.close.apply(this, arguments);
			this.model.off();

			this.trigger('close');
			if (this.onClose) {
				this.onClose();
			}

			return this;

		},
		openDetail: function(){
			this.detailView = new this.infoWindow({
				model: this.model,
				map: this.map,
				maker: this.gOverlay
			});
			this.detailView.render();
		},
		closeDetail: function(){
			if (this.detailView) {
				this.detailView.close();
				this.detailView = null;
			}
		}
	})

	// Collection Marker;
	vnptMap.MarkerCollectionView = Backbone.View.extend({
		constructor: function(options){
			this.markerView = this.markerView || vnptMap.MarkerView;
			this.markerViewChildren = this.markerViewChildren || {};
			Backbone.View.prototype.constructor.apply(this, arguments);

			this.options = options;
			_.bindAll(this, 'render','removeChildren','removeChild','addChild','refresh','close');
			if (!this.options.map && !this.map) {
				throw new Error('Map is required');
			}
			this.map || (this.map = this.options.map);

			this.collection.on('reset',this.refresh, this);
			this.collection.on('add', this.addChild, this);
			this.collection.on('remove', this.removeChild, this);
		},
		render: function(collection) {
			var collection = collection || this.collection;
			this.trigger('before:render');
			if (this.beforeRender) {
				this.beforeRender();
			}

			collection.each(this.addChild);

			this.trigger('render');
			if (this.onRender) {
				this.onRender();
			}

			return this;
		},
		removeChildren: function(){
			for(var cid in this.markerViewChildren){
				this.removeChild(this.markerViewChildren[cid]);
			}
		},
		removeChild: function(child) {
			var childView = (child instanceof Backbone.Model)? this.markerViewChildren[child.cid]: child;

			childView.close();
			delete this.markerViewChildren[childView.model.cid];
		},
		addChild: function(child){
			var markerView = new this.markerView({
				model: child.model,
				map: this.map
			})

			this.markerViewChildren[child.cid] = markerView;
			markerView.render();
		},
		refresh: function(){
			this.removeChildren();
			this.render();
		},
		close: function(){
			this.removeChildren();
			this.collection.off();
		}
	})
	return vnptMap;
});