const fs = require('fs');
const util = require('util');
const path = require('path');

const Attachment = require('../db/models/Attachment.js');

const files = {};

const _cleanupFile = function (id, clearFile = false) {
    const fileInfo = files[id];
    if (fileInfo.writeStream) {
        fileInfo.writeStream.end();
    }
    if (clearFile) {
        fs.unlink(path.resolve('temp/' + files[id].name), function (err) {
        });
    }
    delete files[id];
};

const _emitComplete = function (socket, id) {
    const fileInfo = files[id];
    // Check if the upload was aborted
    if (!fileInfo) {
        return;
    }
    new Attachment({
        file: fileInfo.name,
        user: socket.decoded_token._id,
    }).save().then(function (doc) {
        fs.rename(path.resolve('temp/'+socket.id+fileInfo.name), path.resolve('private-docs/'+doc._id+'_'+doc.file), function (err) {});
        socket.emit('uploadComplete', {
            id: fileInfo.id,
            _id: doc._id.toString(),
        });
    }).catch(function (err) {

    });
};

module.exports = function(client) {
    client.on('startUpload', function (data) {
        if (files[client.id]) {
            return false;
        }

        files[client.id] = {
            name: data.name,
            size: data.size,
            id: data.id,
            data: '',
            downloaded: 0
        };

        let writeStream = fs.createWriteStream(path.resolve('temp/'+client.id+data.name), {
            mode: '0666'
        });
        writeStream.on('open', function () {
            client.emit('uploaderReady', {
                id: data.id
            });
        });
        writeStream.on('error', function (err) {
            console.log(err);
            _emitComplete(client, client.id, false);
            _cleanupFile(client.id, true);
        });
        files[client.id].writeStream = writeStream;
    });

    client.on('uploadChunk', function (data) {
        if (!files[client.id]) {
            return false;
        }
        const buffer = new Buffer(data.content);
        files[client.id].downloaded += buffer.length;

        files[client.id].writeStream.write(buffer, function () {
            if (files[client.id].downloaded < files[client.id].size) {
                client.emit('chunkUploaded', {
                    id: files[client.id].id,
                    downloaded: files[client.id].downloaded
                });
            } else {
                _emitComplete(client, client.id);
                _cleanupFile(client.id)
            }
        });
    });

    // todo: ondisconnect delete files


};