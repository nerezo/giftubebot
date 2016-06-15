'use strict'

var utils = require('./utils.js');
var Q = require('q');
require('shelljs/global');

var ffmppegLogLevel = utils.defaults.loggerLevel === 'TRACE' ? 'verbose' : 'quiet';

/*
 * Crops video part about "to" from "start" time by real video url.
 * "to" is second.
 */
var cropVideoFromUrl = function(start, to, resolution, realUrl, videoId) {
  utils.logger.trace('ENTER - Crop video from url. Start:', start, ', To:', to, ', Resolution:', resolution, ', RealUrl:', realUrl, ', VideoId:', videoId);

  var deferred = Q.defer();

  // Check the passed resoluttion value and decide scale ratio. This scale rule reduce the resolution fifty percent.
  var horizontalRes = Number(resolution.res.split('x')[0]);
  var scale = (horizontalRes < 640 ? ' ' : ' -vf "scale=trunc(iw/4)*2:trunc(ih/4)*2" ');

  var croppedFilename = utils.md5(start + '_' + to + '_' + videoId) + '_' + utils.defaults.cropFilePostfix + '.mp4';

  utils.logger.info('Cropped filename:', croppedFilename, 'for the Start:', start, ', To:', to, ', VideoId:', videoId);

  var croppedFileWithPath = utils.defaults.videoBowl + '/' + croppedFilename;

  realUrl = realUrl.trim();
  var ffmpegCommand = 'ffmpeg -loglevel ' + ffmppegLogLevel + ' -ss ' + start + ' -i "' + realUrl + '" -t ' + to + scale + ' -y -an "' + croppedFileWithPath + '"';

  utils.logger.trace(ffmpegCommand);

  exec(ffmpegCommand, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.trace('ffmpeg video conversion from url command status:', code);

    if (Number(code) === 0) {
      deferred.resolve(croppedFilename);
    } else {
      deferred.reject();
    }

    utils.logger.trace('EXIT - Crop video from url. Start:', start, ', To:', to, ', Resolution:', resolution, ', RealUrl:', realUrl, ', VideoId:', videoId);
  });

  return deferred.promise;
};
module.exports.cropVideoFromUrl = cropVideoFromUrl;

/*
 * Embed the logo to the upper left of the specified video and returns again.
 */
var embedLogoAsWatermark = function(croppedFilename) {
  utils.logger.trace('ENTER - Embed logo image to video. CroppedFilename:', croppedFilename);

  var deferred = Q.defer();

  var videoNameWithoutPostfix = croppedFilename.split('_')[0];
  var finalFilename = videoNameWithoutPostfix + '_' + utils.defaults.finalFilePostfix + '.mp4';

  utils.logger.info('Final filename:', finalFilename);

  var croppedFileWithPath = utils.defaults.videoBowl + '/' + croppedFilename;
  var finalcroppedFileWithPath = utils.defaults.videoBowl + '/' + finalFilename;
  var imageFileWithPath = utils.defaults.imageDir + '/' + utils.defaults.watermarkImage;

  // Locate the image upper left of the video.
  var filterComplex = '"overlay=5:5:format=rgb,format=yuv420p"';

  var ffmpegCommand = 'ffmpeg -loglevel ' + ffmppegLogLevel + ' -i "' + croppedFileWithPath + '" -i "' + imageFileWithPath + '" -filter_complex ' + filterComplex + ' -y -an "' + finalcroppedFileWithPath + '"';

  utils.logger.trace(ffmpegCommand);

  exec(ffmpegCommand, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.trace('ffmpeg video image embed command status:', code);

    if (Number(code) === 0) {
      // Remove the cropped file.
      utils.logger.trace('Removing the cropped file:', croppedFileWithPath);
      exec('rm -rf ' + croppedFileWithPath);

      deferred.resolve(finalFilename);
    } else {
      deferred.reject();
    }

    utils.logger.trace('EXIT - Embed logo image to video. VideoFile:', croppedFilename);
  });

  return deferred.promise;
};
module.exports.embedLogoAsWatermark = embedLogoAsWatermark;
