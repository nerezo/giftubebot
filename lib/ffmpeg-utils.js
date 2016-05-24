'use strict'

var utils = require('./utils.js');
var Q = require('q');
require('shelljs/global');

/*
 Crops video file part about "to" from "start" duration. "to" is second.
 */
var cropVideo = function (file, start, to) {
    utils.logger.trace('ENTER - Crop video:', file, ', Start:', start, ', To:', to);

    var deferred = Q.defer();

    var scale = 'iw*.5:ih*.5';
    var async = '1';
    var ffmppegLogLevel = utils.defaults.loggerLevel === 'TRACE' ? 'verbose' : 'quiet';

    var croppedFile = file.split('.mp4')[0] + '_' + utils.defaults.cropFilePostfix + '.mp4';

    var ffmpegCommand = 'ffmpeg -loglevel ' + ffmppegLogLevel + ' -ss ' + start + ' -t ' + to + ' -i ' + file + ' -vf scale=' + scale + ' -async ' + async + ' -strict -2 -an ' + croppedFile;
    exec(ffmpegCommand, function (code, stdout, stderr) {
        utils.logger.info('ffmpeg video conversion command status:', code);

        if (Number(code) === 0) {
            deferred.resolve(croppedFile);
        } else {
            deferred.reject();
        }

        utils.logger.trace('EXIT - Crop video:', file, ', Start:', start, ', To:', to);
    });

    return deferred.promise;
};
module.exports.cropVideo = cropVideo;
