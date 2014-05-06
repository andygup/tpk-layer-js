define(["dojo/_base/declare"],function(declare){
    return declare(null,{

        constructor:function(/* Map */ map,/* int */ delay){
            this.map = map;
            this._setPanListener();
            this._setZoomListener();
            this._setOrientationListener(delay);
            var centerPt = map.extent.getCenter();
            this._setCenterPt(centerPt.x,centerPt.y,map.spatialReference.wkid);
        },

        /**
         * Activates the orientation listener and listens for native events.
         * Handle orientation events to allow for resizing the map and working around
         * 3rd party library bugs related to how and when the view settles after such an event
         */
        _setOrientationListener: function(delay){
            var supportsOrientationChange = "onorientationchange" in window,
                orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

            window.addEventListener(orientationEvent, function(evt){
                console.log("event")
                this._centerMap(this);
            }.bind(this), false);
        },

        _centerMap: function(context){
//            var centerPt = this.map.extent.getCenter();
            setTimeout(
                function(){
                    var locationStr = context._getCenterPt().split(",");
                    console.log("center: " + JSON.stringify(locationStr))

                    var wkid = context.map.spatialReference.wkid;
                    var mapPt = null;
                    if(wkid == 4326){
                        mapPt = new esri.geometry.Point(locationStr[1],locationStr[0]);
                    }
                    else if(wkid = 102100){
                        mapPt = new esri.geometry.Point(locationStr[0],locationStr[1], new esri.SpatialReference({ wkid: wkid }));
                    }
                    context.map.centerAt(mapPt);
                }
                ,1000);
        },

        /**
         * Automatically sets new center point in local storage.
         */
        _setPanListener: function(){
            this.map.on("pan-end",function(){
                var center = this.map.extent.getCenter();
                this._setCenterPt(center.x,center.y,this.map.spatialReference.wkid);
            }.bind(this))
        },

        /**
         * Automatically sets new center point and zoom level in
         * local storage.
         */
        _setZoomListener: function(){
            this.map.on("zoom-end",function(){
                var center = this.map.extent.getCenter();
                this.setCenterPt(center.x,center.y,this.map.spatialReference.wkid);
                this.setZoom(this.map.getZoom());
            }.bind(this))
        },

        /**
         * Uses localStorage to save a location.
         * @param lat
         * @param lon
         * @param spatialReference
         */
        _setCenterPt: function(lat,lon,spatialReference){
            localStorage.setItem("_centerPtX", lat);
            localStorage.setItem("_centerPtY", lon);
            localStorage.setItem("_spatialReference", spatialReference);
        },

        /**
         * Pulls a saved location from localStorage
         * Requires that setCenterPt() has been set.
         * @returns String x,y,spatialReference
         */
        _getCenterPt: function(){
            var value = null;

            try{
                value = localStorage.getItem("_centerPtX") + "," + localStorage.getItem("_centerPtY") + "," +
                    localStorage.getItem("_spatialReference");
            }
            catch(err)
            {
                console.log("getCenterFromLocalStorage: " + err.message);
            }

            return value;
        }

    })
})