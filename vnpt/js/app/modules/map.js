define(['jquery', 'backbone', 'underscore', 'plugins/vnpt-map','async!https://maps.googleapis.com/maps/api/js?key=AIzaSyBYh47nfgrO6fz3FMv0OhryKqc42rMh0TQ'], function($, backbone, _, vnptMap) {
    'use strict';
    var Map = {};
    // Sample Data
    var museums = [{
        title: "Walker Art Center",
        lat: 44.9796635,
        lng: -93.2748776,
        type: 'museum'
    }, {
        title: "Science Museum of Minnesota",
        lat: 44.9429618,
        lng: -93.0981016,
        type: 'museum'
    }, {
        title: "The Museum of Russian Art",
        lat: 44.9036337,
        lng: -93.2755413,
        type: 'museum'
    }];
    var bars = [{
        title: "Park Tavern",
        lat: 44.9413272,
        lng: -93.3705791,
        type: 'bar'
    }, {
        title: "Chatterbox Pub",
        lat: 44.9393882,
        lng: -93.2391039,
        type: 'bar'
    }, {
        title: "Acadia Cafe",
        lat: 44.9709853,
        lng: -93.2470717,
        type: 'bar'
    }];
    Map.Location = vnptMap.Location.extend({
        idAttribute: 'title',
        defaults: {
            lat: 45,
            lng: -93
        }
    });
    Map.LocationCollection = vnptMap.LocationCollection.extend({
        model: Map.Location
    });
    Map.InfoWindow = vnptMap.InfoWindow.extend({
        template: '#infoWindow-template',
        events: {
            'mouseenter h2': 'logTest'
        },
        logTest: function() {
            console.log('test in InfoWindow');
        }
    });
    Map.MarkerView = vnptMap.MarkerView.extend({
        infoWindow: Map.InfoWindow,
        initialize: function() {
            _.bindAll(this, 'handleDragEnd');
        },
        mapEvents: {
            'dragend': 'handleDragEnd',
            dblclick: 'tellTheWorldAboutIt'
        },
        handleDragEnd: function(e) {
            alert('Dropped at: \n Lat: ' + e.latLng.lat() + '\n lng: ' + e.latLng.lng());
        },
        tellTheWorldAboutIt: function() {
            console.assert(this instanceof Map.MarkerView);
            alert('You done gone and double-clicked me!');
            this.logIt('I hope you know that this will go down on your permanent record.')
        },
        logIt: function(message) {
            console.assert(this instanceof Map.MarkerView);
            console.log(message);
        }
    });
    Map.MuseumMarker = Map.MarkerView.extend({
        overlayOptions: {
            draggable: true,
            // icon: 'assets/museum.png'
        }
    });
    Map.BarMarker = Map.MarkerView.extend({
        overlayOptions: {
            draggable: true,
            // icon: 'assets/beer.png'
        }
    });
    Map.MarkerCollectionView = vnptMap.MarkerCollectionView.extend({
        markerView: Map.MarkerView,
        addChild: function(model) {
            this.markerView = model.get('type') === 'museum' ? Map.MuseumMarker : Map.BarMarker;
            vnptMap.MarkerCollectionView.prototype.addChild.apply(this, arguments);
        }
    });
    Map.init = function() {
        this.createMap();
        const obj = {
            title: "Walker Art Center",
            lat: 44.9796635,
            lng: -93.2748776,
            type: 'museum'
        };
        const location = new this.Location({
            title: "Walker Art Center",
            lat: 44.9796635,
            lng: -93.2748776,
            type: 'museum'
        })
        var Marker = new this.MarkerView({
            model: location,
            map: this.map
        });
        Marker.render();
        // this.places = new this.LocationCollection(museums);
        // // Render Markers
        // var markerCollectionView = new this.MarkerCollectionView({
        //     collection: this.places,
        //     map: this.map
        // });
        // markerCollectionView.render();
        // Render ListView
        // var listView = new Map.ListView({
        //     collection: this.places
        // });
        // listView.render();
    }
    Map.createMap = function() {
        var mapOptions = {
            center: new google.maps.LatLng(44.9796635, -93.2748776),
            zoom: 12,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        }
        // Instantiate map
        this.map = new google.maps.Map($('#map_canvas')[0], mapOptions);
    }
    // /**
    //  * List view
    //  */
    // Map.ItemView = Backbone.View.extend({
    //     template: '<%=title %>',
    //     tagName: 'li',
    //     events: {
    //         'mouseenter': 'selectItem',
    //         'mouseleave': 'deselectItem'
    //     },
    //     initialize: function() {
    //         _.bindAll(this, 'render', 'selectItem', 'deselectItem')
    //         this.model.on("remove", this.close, this);
    //     },
    //     render: function() {
    //         var html = _.template(this.template, this.model.toJSON());
    //         this.$el.html(html);
    //         return this;
    //     },
    //     close: function() {
    //         this.$el.remove();
    //     },
    //     selectItem: function() {
    //         this.model.select();
    //     },
    //     deselectItem: function() {
    //         this.model.deselect();
    //     }
    // });
    // Map.ListView = Backbone.View.extend({
    //     tagName: 'ul',
    //     className: 'overlay',
    //     id: 'listing',
    //     initialize: function() {
    //         _.bindAll(this, "refresh", "addChild");
    //         this.collection.on("reset", this.refresh, this);
    //         this.collection.on("add", this.addChild, this);
    //         this.$el.appendTo('body');
    //     },
    //     render: function() {
    //         this.collection.each(this.addChild);
    //     },
    //     addChild: function(childModel) {
    //         var childView = new Map.ItemView({
    //             model: childModel
    //         });
    //         childView.render().$el.appendTo(this.$el);
    //     },
    //     refresh: function() {
    //         this.$el.empty();
    //         this.render();
    //     }
    // });
    // $(document).ready(function() {
    //     Map.init();
    //     $('#bars').click(function() {
    //         Map.places.reset(bars);
    //     });
    //     $('#museums').click(function() {
    //         Map.places.reset(museums);
    //     });
    //     $('#addBtn').click(function() {
    //         Map.places.add({
    //             title: 'State Capitol Building',
    //             lat: 44.9543075,
    //             lng: -93.102222
    //         });
    //     });
    //     $('#removeBtn').click(function() {
    //         Map.places.remove(App.places.at(0));
    //     });
    // });
    return Map;
});