var tilesArray = null;

onmessage = function(msg){

    switch(msg.data.type){
        case "tiles":
            tilesArray = msg.data.array;
            break;
        case "image":
            _buffer2Base64(tilesArray[msg.data.imageIndex],msg.data.pointer,function(image){
                this.postMessage({type:"image",image:image,tileid:msg.data.tileid});
            }.bind(this))
            break;
    }
}

/**
 * Given a ArrayBuffer and a position it will return a Base64 tile image
 * @param arrayBuffer
 * @param position
 * @returns {string}
 * @private
 */
function _buffer2Base64(/* ArrayBuffer */arrayBuffer,/* int */ position,callback){
    var view = new DataView(arrayBuffer,position);
    var chunk = view.getInt32(0,true);
    var buffer = view.buffer.slice(position + 4,position + chunk);
    var blob = new Blob([buffer]);
    var reader = new FileReader()
    reader.onloadend = function(evt){
        callback(btoa(this.result));
    }
    reader.readAsBinaryString(blob);
}
