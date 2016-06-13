'use strict'

var fs = require('fs');
var utils = require('./utils.js');
var ytdl = require('youtube-dl');
var Q = require('q');

var getVideoInfo = function(url) {
  utils.logger.trace('ENTER - Get video info:', url);

  var deferred = Q.defer();

  ytdl.getInfo(url, function(err, info) {
    if (err) {
      utils.logger.warn('Error occurred:', err, 'video url:', url);

      deferred.reject(err);
    } else {
      var duration;
      // Check if the url is vine url there should not be duration value since vine videos has 6 seconds as duration.
      if (url.indexOf('vine') > -1) {
        duration = 6;
      } else {
        duration = info.duration;
      }

      var res = {
        url: info.webpage_url,
        title: info.title,
        duration: utils.formatDurationString(duration)
      };

      utils.logger.info('Video information:', res);

      utils.logger.trace('EXIT - Get video info:', info.webpage_url, 'title:', info.title);

      deferred.resolve(res);
    }
  });

  return deferred.promise;
};
module.exports.getVideoInfo = getVideoInfo;

// This wrapper created in order to mock the ytdl constructor.
var ytdlWrapper = function(url, args) {
  var video = ytdl(url, args);

  return video;
}
module.exports.ytdlWrapper = ytdlWrapper;

var videoDownload = function(file, format, url) {
  utils.logger.trace('ENTER - Download video:', url, 'file:', file, 'format:', format);

  var deferred = Q.defer();

  var video = module.exports.ytdlWrapper(url, ['--format', format]);

  video.on('error', function error(err) {
    utils.logger.warn('Error occurred:', err, 'video url:', url);

    deferred.reject(err);
  });

  video.on('end', function() {
    utils.logger.info('Video downloaded:', url);

    utils.logger.trace('EXIT - Download video:', url, 'file:', file, 'format:', format);

    deferred.resolve(file);
  });

  video.pipe(fs.createWriteStream(file));

  return deferred.promise;
};
module.exports.videoDownload = videoDownload;

/*
 * Returns one suitable video format which is video only and resolution of it is lower than the passed
 * resolutionLimit parameter.
 */
var getSuitableVideoFormat = function(url, resolutionLimit) {
  utils.logger.trace('ENTER - Get suitable video format:', url, ', resolutionLimit:', resolutionLimit);

  var deferred = Q.defer();

  resolutionLimit = resolutionLimit || '640';

  var grepFilters = ' grep -E -v "best|mp4a" ';
  var awkFilters = ' awk \'{split($3,a,"x"); if (a[1] <= ' + resolutionLimit + ' && $2 == "mp4") { print $3","$1; }}\' ';
  var sortFilters = ' sort -r | head -1 '

  var command = 'youtube-dl --list-formats --prefer-free-formats --youtube-skip-dash-manifest "' + url + '" |' + grepFilters + '|' + awkFilters + '|' + sortFilters;

  exec(command, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.info('youtube-dl list all formats command status:', code);

    if (Number(code) === 0) {
      var formatInfo = stdout.trim().split(',');

      var resolution = {
        res: formatInfo[0],
        format: formatInfo[1]
      };

      deferred.resolve(resolution);
    } else {
      deferred.reject();
    }

    utils.logger.trace('EXIT - Get suitable video format:', url, ', resolutionLimit:', resolutionLimit);
  });

  return deferred.promise;
};
module.exports.getSuitableVideoFormat = getSuitableVideoFormat;

/*
 * Returns real download url of the video by given url and resolution format.
 */
var getRealVideoUrl = function(url, start, resolution) {
  utils.logger.trace('ENTER - Get real video url. short url:', url, ', resolution: ', resolution);

  var deferred = Q.defer();

  var format = (resolution.format ? ' -f ' + resolution.format : '');

  var command = 'youtube-dl --get-url --youtube-skip-dash-manifest ' + format + ' ' + url;

  exec(command, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.info('youtube-dl get video url command status:', code);

    if (Number(code) === 0) {
      deferred.resolve(stdout);
    } else {
      deferred.reject();
    }

    utils.logger.trace('EXIT - Get real video url. short url:', url, ', resolution: ', resolution);
  });

  return deferred.promise;
};
module.exports.getRealVideoUrl = getRealVideoUrl;
