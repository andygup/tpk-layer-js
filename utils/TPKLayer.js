define([
    "dojo/_base/declare","esri/geometry/Extent","dojo/query","esri/SpatialReference","utils/DataStream"],
    function(declare,Extent,query,SpatialReference,DataStream){
        return declare(null,{
            _self: this,
            _extent: null,
            _inMemTiles: null,
            _inMemTilesIndex: null,
            _spatialReference: null,
            constructor:function(){
                this._self = this;
            },

            setTPKTiles: function(tiles,callback){
                this._inMemTiles = tiles;

                // Create a new array that contains an index of what is in the zip file. This will let us provide
                // a highly optimized search pattern based on each tiles filename. We can then look up the
                // index first and then use that index to retrieve the exact tile without having to iterate
                // through a large in memory Array.
                this._inMemTilesIndex = tiles.map(function(tile){
                    console.log("name " + tile.filename.toLocaleUpperCase())
                    return tile.filename.toLocaleUpperCase();
                })

                //Set initial map extent, spatialReference, etc
                var m_conf_index = this._inMemTilesIndex.indexOf("V101/LAYERS/CONF.CDI");
                if(m_conf_index != -1){
                    var m_conf = this._inMemTiles[m_conf_index];
                    m_conf.getData(new zip.TextWriter(),function(data){
                        var parser = new DOMParser();
                        var xml = parser.parseFromString(data,"text/xml");
                        var json = this._xmlToJSON(xml)
                        this._spatialReference = parseInt(json.EnvelopeN.SpatialReference.WKID["#text"]);
                        this._extent = new Extent()
                        this._extent.xmin = parseInt(json.EnvelopeN.XMin["#text"]);
                        this._extent.xmax = parseInt(json.EnvelopeN.XMax["#text"]);
                        this._extent.ymin = parseInt(json.EnvelopeN.YMin["#text"]);
                        this._extent.ymax = parseInt(json.EnvelopeN.YMax["#text"]);
                        this._extent.spatialReference = new SpatialReference({wkid:this._spatialReference});
                        callback(true);
                        console.log("Finished reading conf.cdi")
                    }.bind(this._self))
                }
            },

            //http://davidwalsh.name/convert-xml-json
            _xmlToJSON: function(xml) {

                // Create the return object
                var obj = {};

                if (xml.nodeType == 1) { // element
                    // do attributes
                    if (xml.attributes.length > 0) {
                        obj["@attributes"] = {};
                        for (var j = 0; j < xml.attributes.length; j++) {
                            var attribute = xml.attributes.item(j);
                            obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                        }
                    }
                } else if (xml.nodeType == 3) { // text
                    obj = xml.nodeValue;
                }

                // do children
                if (xml.hasChildNodes()) {
                    for(var i = 0; i < xml.childNodes.length; i++) {
                        var item = xml.childNodes.item(i);
                        var nodeName = item.nodeName;
                        if (typeof(obj[nodeName]) == "undefined") {
                            obj[nodeName] = this._xmlToJSON(item);
                        } else {
                            if (typeof(obj[nodeName].push) == "undefined") {
                                var old = obj[nodeName];
                                obj[nodeName] = [];
                                obj[nodeName].push(old);
                            }
                            obj[nodeName].push(this._xmlToJSON(item));
                        }
                    }
                }
                return obj;
            },

            extend: function(layer,callback){
                var _layersDir = "v101/Layers/_alllayers";
                var _tileFormat = null;
                var _tileDPI = null;

                this._inMemTiles == null ? layer._inMemTiles = [] : layer._inMemTiles = this._inMemTiles;
                this._inMemTilesIndex == null ? layer._inMemTilesIndex = [] : layer._inMemTilesIndex = this._inMemTilesIndex; //an index of files in the zip

                layer._getTileUrl = layer.getTileUrl;
                layer.resampling = false;
                layer.getTileUrl = function(level,row,col){
                    var url = this._getTileUrl(level,row,col); console.log("level: " + level + ", scale: " + layer._map.getScale())
                    if(layer._inMemTiles.length > 0){
                        /* temporary URL returned immediately, as we haven't retrieved the image from the indexeddb yet */
                        var tileid = "void:/"+level+"/"+row+"/"+col;

                        this._getInMemTiles(_layersDir,level,row,col,function(result){

                                var img = query("img[src="+tileid+"]")[0];
                                var imgURL;

                                console.assert(typeof img != "undefined","undefined image detected");

                                if( result != null )
                                {
                                    img.style.borderColor = "blue";
                                    console.log("found tile offline", url);
                                    imgURL = "data:image/png;base64," + result;
                                }
                                else
                                {
                                    if(typeof img == "undefined")img = new Image(256,256);
                                    img.style.borderColor = "green";
                                    console.log("tile is not in the offline store", url);
                                    imgURL = "data:image/png;base64,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pmk0TROPj48Hn3l4eIimaSJN06O3A4NJwDMxm82ibdtXo4D5fB6r1Sp+//4dz8/Pw5H+6ekpdrtdJEkS8/n8S/9f713ie3vaceo9x557QAB451Sgfyin34HKshweunk5HzAej2MymXz5+f9nbjJyI9L39Wu5XP55+XQZ39uxR4Z3u90wSXjqEV0wAjhjx47oaZq63Me/ZhIQBAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAAbAJQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAvqe/BwCeKjUweoA8pQAAAABJRU5ErkJggg==";
                                }
                                // when we return a nonexistent url to the image, the TiledMapServiceLayer::_tileErrorHandler() method
                                // sets img visibility to 'hidden', so we need to show the image back once we have put the data:image
                                img.style.visibility = "visible";
                                img.src = imgURL;
                                console.log("URL length " + imgURL.length + ", url: " + imgURL)
                                return "";  /* this result goes nowhere, seriously */
                        });

                        return tileid;
                    }

                    return url;
                }
                callback(true);

                layer._calcOffset = function(/* int */level, /* number */row,/* number */col, /* number */startRow, /* number */ startCol){
                    var recordNumber = 128 * (col - startCol) + (row - startRow);
                    return 16 + recordNumber * 5;
                },

                layer._getInMemTiles = function(layersDir,level,row,col,callback){

                    var snappedRow = Math.floor(row / 128) * 128;
                    var snappedCol = Math.floor(col / 128) * 128;

                    var path = this._buildCacheFilePath(layersDir,level,snappedRow,snappedCol).toLocaleUpperCase();

                    var offset;
                    var bundle;
                    var bundleX;
                    var bundleIndex = layer._inMemTilesIndex.indexOf(path + ".BUNDLE");
                    var bundleXIndex;

                    if(bundleIndex != -1){
                        bundle = layer._inMemTiles[bundleIndex];
                    }
                    else{
                        callback(null) //didn't find anything
                    }

                    bundleXIndex = layer._inMemTilesIndex.indexOf(path + ".BUNDLX");
                    if( bundleXIndex != -1){
                        bundleX = layer._inMemTiles[bundleXIndex];
                    }
                    else{
                        callback(null)
                    }
                    if(typeof  bundleX != "undefined"){

                        offset = layer._calcOffset(level, row, col, snappedRow, snappedCol);

                        bundleX.getData(new zip.BlobWriter(),function(data){

                            var reader = new FileReader();
                            reader.addEventListener("loadend", function(evt) {

                                var t = this.result.slice(offset);
                                var dv =  new DataView(t,0,5);

                                var nume1 = dv.getUint8(0,true);
                                var nume2 = dv.getUint8(1,true);
                                var nume3 = dv.getUint8(2,true);
                                var nume4 = dv.getUint8(3,true);
                                var nume5 = dv.getUint8(4,true);

                                var value = nume5;
                                value = value * 256 + nume4;
                                value = value * 256 + nume3;
                                value = value * 256 + nume2;
                                value = value * 256 + nume1;

                                bundle.getData(new zip.BlobWriter(),function(data){
                                    var reader = new FileReader();
                                    reader.addEventListener("loadend", function(evt) {

                                        //Notes: Range limits in Chrome: https://bugs.webkit.org/show_bug.cgi?id=80797
                                        var stream = new DataStream(this.result, 0,
                                            DataStream.LITTLE_ENDIAN);
                                        stream.seek(value);
                                        var u = stream.readInt32(true);
                                        var t = stream.readString(u);
                                        callback(btoa(t))
                                    })
                                    reader.readAsArrayBuffer(data); //open bundle
                                })

                                console.log("Pointer value: " + value);

                            });
                            reader.readAsArrayBuffer(data); //open bundleX
                        })
                    }
                    console.log("url  " +  path);
                },

                layer._buildCacheFilePath = function(/* String */ layerDir, /* int */level, /* int */row, /* int */ col){
                    var arr = [];

                    arr.push(layerDir);
                    arr.push("/");
                    arr.push("L");
                    arr.push(level < 10 ? "0" + level : level);
                    arr.push("/");
                    arr.push("R");
                    arr.push(this._toHexString(row));
                    arr.push("C");
                    arr.push(this._toHexString(col));

                    return arr.join("");
                },

                layer._toHexString = function(/* int */ value){
                    var text = value.toString(16).toUpperCase();
                    if (text.length === 1)
                    {
                        return "000" + text;
                    }
                    if (text.length === 2)
                    {
                        return "00" + text;
                    }
                    if (text.length === 3)
                    {
                        return "0" + text;
                    }
                    return text.substr(0, text.length);
                }
            }
        })
})
