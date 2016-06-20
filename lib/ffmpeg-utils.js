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

  utils.logger.trace('Cropped filename:', croppedFilename, 'for the Start:', start, ', To:', to, ', VideoId:', videoId);

  var croppedFileWithPath = utils.defaults.videoBowl + '/' + croppedFilename;

  realUrl = realUrl.trim();
  var ffmpegCommand = 'ffmpeg -loglevel ' + ffmppegLogLevel + ' -ss ' + start + ' -i "' + realUrl + '" -t ' + to + scale + ' -y -an "' + croppedFileWithPath + '"';

  utils.logger.trace(ffmpegCommand);

  exec(ffmpegCommand, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.trace('ffmpeg video conversion from url command status:', code);

    if (Number(code) === 0) {
      utils.logger.trace('Checking video health.');

      var ffprobeCommand = 'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "' + croppedFileWithPath + '"';

      exec(ffprobeCommand, {silent: true}, function(code, stdout, stderr) {
        if (Number(stdout) > 0) {
          utils.logger.trace('Video is healty.');

          deferred.resolve(croppedFilename);
        } else {
          // Remove the cropped file.
          utils.logger.trace('Removing the cropped file:', croppedFileWithPath);
          exec('rm -rf ' + croppedFileWithPath);

          deferred.reject('Video is corrupted!');
        }
      });
    } else {
      deferred.reject('Video cannot be created properly!');
    }

    utils.logger.trace('EXIT - Crop video from url. Start:', start, ', To:', to, ', Resolution:', resolution, ', RealUrl:', realUrl, ', VideoId:', videoId);
  });

  return deferred.promise;
};
module.exports.cropVideoFromUrl = cropVideoFromUrl;

/*
 * Embed the logo to the upper left of the specified video and returns again.
 */
var embedLogoAsWatermark = function(croppedFilename, extractor) {
  utils.logger.trace('ENTER - Embed logo image to video. CroppedFilename:', croppedFilename, ', Extractor:', extractor);

  var deferred = Q.defer();

  var videoNameWithoutPostfix = croppedFilename.split('_')[0];
  var finalFilename = extractor + '_' + videoNameWithoutPostfix + '_' + utils.defaults.finalFilePostfix + '.mp4';

  utils.logger.trace('Final filename:', finalFilename);

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

    // Remove the cropped file.
    utils.logger.trace('Removing the cropped file:', croppedFileWithPath);
    exec('rm -rf ' + croppedFileWithPath);

    if (Number(code) === 0) {
      deferred.resolve(finalFilename);
    } else {
      deferred.reject('The logo cannot be embedded to the video properly!');
    }

    utils.logger.trace('EXIT - Embed logo image to video. VideoFile:', croppedFilename);
  });

  return deferred.promise;
};
module.exports.embedLogoAsWatermark = embedLogoAsWatermark;
