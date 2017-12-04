const fs = require('fs');
const util = require('util');
const path = require('path');


const files = {};

const _cleanupFile = function (user_id, file_id) {
    const fileInfo = files[user_id][id];
    if (fileInfo.writeStream) {
        fileInfo.writeStream.end();
    }
    files[user_id].splice(file_id, 1);
};

const _emitComplete = function (socket, user_id, file_id, success) {
    const fileInfo = files[user_id][file_id];
    // Check if the upload was aborted
    if (!fileInfo) {
        return;
    }
    socket.emit('uploadComplete', {
        id: id,
        success: success,
        //detail: fileInfo.clientDetail
    });
};

module.exports = function(client) {
    client.on('startUpload', function (data) {
        if (!files[client.decoded_token._id]) {
            files[client.decoded_token._id] = {};
        }

        files[client.decoded_token._id].push({
            name: data.name,
            size: data.size,
            data: '',
            downloaded: 0
        });
        let id = files[client.decoded_token._id].length - 1;

        const writeStream = fs.createWriteStream(path.resolve('temp-files/'+file.name), {
            mode: '0666'
        });
        writeStream.on('open', function () {
            // to client
            client.emit('uploadReady', {
                id: id,
                name: newBase
            });
        });
        writeStream.on("error", function (err) {
            _emitComplete(socket, data.id, false);
            self.emit("error", {
                file: fileInfo,
                error: err,
                memo: "from within write stream"
            });
            _cleanupFile(data.id);
        });
        files[client.decoded_token._id][id].writeStream = writeStream


        client.emit('uploadReady', files[client.decoded_token._id][id]);
    });


};