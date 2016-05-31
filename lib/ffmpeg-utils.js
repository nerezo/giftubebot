'use strict'

var utils = require('./utils.js');
var Q = require('q');
require('shelljs/global');

/*
 * Crops video file part about "to" from "start" time. "to" is second.
 */
var cropVideo = function(file, start, to, resolution) {
  utils.logger.trace('ENTER - Crop video:', file, ', Start:', start, ', To:', to);

  var deferred = Q.defer();

  var ffmppegLogLevel = utils.defaults.loggerLevel === 'TRACE' ? 'verbose' : 'quiet';

  // Check the passed resoluttion value and decide scale ratio. This scale rule reduce the resolution fifty percent.
  var horizontalRes = Number(resolution.res.split('x')[0]);
  var scale = (horizontalRes < 640 ? ' ' : ' -vf scale=iw*.5:ih*.5 ');

  var croppedFile = file.split('.mp4')[0] + '_' + utils.defaults.cropFilePostfix + '.mp4';

  var ffmpegCommand = 'ffmpeg -i "' + file + '" -loglevel ' + ffmppegLogLevel + ' -ss ' + start + ' -t ' + to + scale + ' -y -an ' + croppedFile;

  exec(ffmpegCommand, {
    silent: true
  }, function(code, stdout, stderr) {
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

/*
 * Crops video part about "to" from "start" time by real video url.
 * "to" is second.
 */
var cropVideoFromUrl = function(start, to, resolution, realUrl) {
  utils.logger.trace('ENTER - Crop video from url. Start:', start, ', To:', to, ', Resolution:', resolution, ', RealUrl:', realUrl);

  var deferred = Q.defer();

  var ffmppegLogLevel = utils.defaults.loggerLevel === 'TRACE' ? 'verbose' : 'quiet';

  // Check the passed resoluttion value and decide scale ratio. This scale rule reduce the resolution fifty percent.
  var horizontalRes = Number(resolution.res.split('x')[0]);
  var scale = (horizontalRes < 640 ? ' ' : ' -vf "scale=trunc(iw/4)*2:trunc(ih/4)*2" ');

  var croppedFile = utils.defaults.videoBowl + '/' + utils.getNanoTime() + '_' + utils.defaults.cropFilePostfix + '.mp4';

  realUrl = realUrl.trim();
  var ffmpegCommand = 'ffmpeg -loglevel ' + ffmppegLogLevel + ' -ss ' + start + ' -i "' + realUrl + '" -t ' + to + scale + ' -y -an ' + croppedFile;

  exec(ffmpegCommand, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.info('ffmpeg video conversion from url command status:', code);

    if (Number(code) === 0) {
      deferred.resolve(croppedFile);
    } else {
      deferred.reject();
    }

    utils.logger.trace('EXIT - Crop video from url. Start:', start, ', To:', to, ', Resolution:', resolution, ', RealUrl:', realUrl);
  });

  return deferred.promise;
};
module.exports.cropVideoFromUrl = cropVideoFromUrl;
