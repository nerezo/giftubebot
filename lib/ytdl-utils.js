'use strict'

var fs = require('fs');
var utils = require('./utils.js');
var ytdl = require('youtube-dl-exec')
var Q = require('q');

var getVideoInfo = function(url) {
  utils.logger.trace('ENTER - Get video info:', url);

  var deferred = Q.defer();

  ytdl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    noCheckCertificate: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true
  }).then(function(output) {
    var duration = 0;
    var extractor = info.extractor ? info.extractor.toLowerCase() : undefined;

    // Check if the extractor is different from youtube or vimeo. There is no duration value in their informations.
    if (extractor && (extractor === 'youtube') || (extractor === 'vimeo')) {
      duration = info.duration ? info.duration : 0;
    }

    var res = {
      id: info.id,
      extractor: extractor,
      url: info.webpage_url,
      title: info.title,
      duration: utils.formatDurationString(duration)
    };

    utils.logger.info('Video information:', JSON.stringify(res));

    utils.logger.trace('EXIT - Get video info:', info.webpage_url, 'title:', info.title);

    deferred.resolve(res);
  }, function(error) {
    utils.logger.warn('getVideoInfo - Error occurred:', err, 'video url:', url);

    deferred.reject(err);
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
    utils.logger.warn('videoDownload - Error occurred:', err, 'video url:', url);

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

  var grepFilters = ' grep best ';
  //var grepFilters = ' grep -E -v -i "best|mp4a" ';
  if ((url.indexOf('youtube') === -1) && (url.indexOf('youtu.be') === -1) && (url.indexOf('vimeo') === -1)) {
    //grepFilters = ' grep -i -v "best" | egrep -i "mp4|webm" ';
    grepFilters = ' egrep -i "mp4|webm" ';
  }

  resolutionLimit = resolutionLimit || '1280';

  var awkFilters = ' awk \'{split($3,a,"x"); if ((a[1] <= ' + resolutionLimit + ' || a[1] == "unknown") && ($2 == "mp4" || $2 == "webm")) { print $3","$1; }}\' ';
  var sortFilters = ' sort -rg | head -1 '

  //var command = 'yt-dlp --list-formats --prefer-free-formats --youtube-skip-dash-manifest "' + url + '" |' + grepFilters + '|' + awkFilters + '|' + sortFilters;
  var command = 'yt-dlp --list-formats --prefer-free-formats "' + url + '" |' + grepFilters + '|' + awkFilters + '|' + sortFilters;

  utils.logger.trace(command);

  exec(command, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.trace('yt-dlp list all formats command status:', code, ', stdout:', stdout, ', stderr:', stderr);

    if (Number(code) === 0 && stdout) {
      var formatInfo = stdout.trim().split(',');

      var resolution = {
        res: formatInfo[0],
        format: formatInfo[1]
      };

      utils.logger.trace('resolution:', resolution);

      deferred.resolve(resolution);
    } else {
      if (stderr)
        deferred.reject(stderr);
      else
        deferred.reject('Available formats of the video cannot be obtained!');
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

  var format = (resolution && resolution.format ? ' -f ' + resolution.format : '');

  //var command = 'yt-dlp --get-url --youtube-skip-dash-manifest ' + format + ' "' + url + '"';
  var command = 'yt-dlp --get-url ' + format + ' "' + url + '"';

  utils.logger.trace(command);

  exec(command, {
    silent: true
  }, function(code, stdout, stderr) {
    utils.logger.trace('yt-dlp get video url command status:', code);

    if (Number(code) === 0) {
      deferred.resolve(stdout);
    } else {
      deferred.reject('Real url cannot be obtained!');
    }

    utils.logger.trace('EXIT - Get real video url. short url:', url, ', resolution: ', resolution);
  });

  return deferred.promise;
};
module.exports.getRealVideoUrl = getRealVideoUrl;

