(function(obj) {

    var requestFileSystem = obj.webkitRequestFileSystem || obj.mozRequestFileSystem || obj.requestFileSystem;

    function onerror(message) {
        alert(message);
    }

    function createTempFile(callback) {
        var tmpFilename = "tmp.dat";
        requestFileSystem(TEMPORARY, 4 * 1024 * 1024 * 1024, function(filesystem) {
            function create() {
                filesystem.root.getFile(tmpFilename, {
                    create : true
                }, function(zipFile) {
                    callback(zipFile);
                });
            }

            filesystem.root.getFile(tmpFilename, null, function(entry) {
                entry.remove(create, create);
            }, create);
        });
    }

    var model = (function() {
        var URL = obj.webkitURL || obj.mozURL || obj.URL;

        return {
            getEntries : function(file, onend) {
                zip.createReader(new zip.BlobReader(file), function(zipReader) {
                    zipReader.getEntries(onend);
                }, onerror);
            },
            getEntryFile : function(entry, creationMethod, onend, onprogress) {
                var writer, zipFileEntry;

                function getData() {
                    entry.getData(writer, function(blob) {
                        var blobURL = creationMethod == "Blob" ? URL.createObjectURL(blob) : zipFileEntry.toURL();
                        onend(blobURL);
                    }, onprogress);
                }

                if (creationMethod == "Blob") {
                    writer = new zip.BlobWriter();
                    getData();
                } else {
                    createTempFile(function(fileEntry) {
                        zipFileEntry = fileEntry;
                        writer = new zip.FileWriter(zipFileEntry);
                        getData();
                    });
                }
            }
        };
    })();

    (function() {

        var spatialReference = {};
        var fullExtent = {};

        var fileInput = document.getElementById("file-input");
        var unzipProgress = document.createElement("progress");
        var fileList = document.getElementById("file-list");
        var creationMethodInput = document.getElementById("creation-method-input");
        var uncompressSize = 0;
        var sizeDiv = document.getElementById("sizeDiv");

        function download(entry, li, a) {
            model.getEntryFile(entry, creationMethodInput.value, function(blobURL) {
                var clickEvent = document.createEvent("MouseEvent");
                if (unzipProgress.parentNode)
                    unzipProgress.parentNode.removeChild(unzipProgress);
                unzipProgress.value = 0;
                unzipProgress.max = 0;
                clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.href = blobURL;
                a.download = entry.filename;
                a.dispatchEvent(clickEvent);
            }, function(current, total) {
                unzipProgress.value = current;
                unzipProgress.max = total;
                li.appendChild(unzipProgress);
            });
        }

        //Added by AndyG.
        function getUncompressedSize(entry){
            uncompressSize += entry.uncompressedSize;
            sizeDiv.innerHTML = "approx. MBs of zip file: " + (uncompressSize/1024/1024).toFixed(4);
        }

        function isMapServerJSON(filename){
            var normal = filename.toLocaleLowerCase();
            if(normal.indexOf("mapserver.json") != -1){
                return true;
            }
            else{
                return false;
            }
        }

        function handleFileByType(filename){

        }

        function buildCacheFilePath(/* String */ layerDir, /* int */level, /* int */ row, /* int */ col)
        {
            var arr = [];

            arr.push(layerDir);
            arr.push("/");
            arr.push("L");
            arr.push(level < 10 ? "0" + level : level);
            arr.push("/");
            arr.push("R");
            arr.push(toHexString(row));
            arr.push("C");
            arr.push(toHexString(col));

            return arr.join("");
        }

        function toHexString(/* int */value)
        {
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
            return text.substr(0, 4);
        }

        if (typeof requestFileSystem == "undefined")
            creationMethodInput.options.length = 1;
        fileInput.addEventListener('change', function() {

            model.getEntries(fileInput.files[0], function(entries) {
                fileList.innerHTML = "";

                entries.forEach(function(entry) {

                    var filename = entry.filename;

                    var fileExt =/\.[0-9a-z]+$/i;
                    var type = filename.match(fileExt);

                    if(entry.uncompressedSize > 0){
                        console.log("type " + type);

                        var isMapServer = isMapServerJSON(filename);

                        //parse mapserver.json for goodies
                        if(isMapServer){
                            entry.getData(new zip.TextWriter(),function(data){
                                var m_data = JSON.parse(data);
                                fullExtent = m_data.contents.fullExtent;
                                spatialReference = m_data.contents.spatialReference;
                                console.log("MapServerData: " + data);
                            })
                        }

                        if(filename == "v101/Layers/_alllayers/L00/R0000C0000.bundle"){
                            entry.getData(new zip.BlobWriter(),function(data){

                                var reader = new FileReader();
                                reader.addEventListener("loadend", function(evt) {
                                    console.log("Ick " + this.result);
                                });
//                                reader.readAsDataURL(data);\
                                reader.readAsBinaryString(data);
//                                reader.readAsText(data);

                                var s = data;
                                console.log("TEST binary:P " + data);
                            })
                        }

                        if(filename == "v101/Layers/_alllayers/L00/R0000C0000.bundlx"){
//                            entry.getData(new zip.BlobWriter(),function(data){
//
//                                var s = ab2str(data)
//
//                                console.log("Blob " + JSON.stringify(data));
//                            })

                            entry.getData(new zip.BlobWriter(),function(data){

                                var reader = new FileReader();
                                reader.addEventListener("loadend", function(evt) {
                                    console.log("Ick " + this.result);
                                });
                                reader.readAsDataURL(data);

                                var s = data;
                                console.log("TEST binary:P " + data);
                            })

                            entry.getData(new zip.TextWriter("text/plain"),function(data){
                                var t = data[0];
//                                var s = str2ab(data);
                                var m_data = JSON.parse(data);
                                console.log("TEST: " + data);
                            })
                        }
                    }

                    //entry.getData(new zip.BlobWriter(""))

                    getUncompressedSize(entry);

                    var li = document.createElement("li");
                    var a = document.createElement("a");
                    a.textContent = entry.filename;
                    a.href = "#";
                    a.addEventListener("click", function(event) {
                        if (!a.download) {
                            download(entry, li, a);
                            event.preventDefault();
                            return false;
                        }
                    }, false);
                    li.appendChild(a);
                    fileList.appendChild(li);
                });
            });
        }, false);
    })();

})(this);