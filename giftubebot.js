'use strict'

var utils = require('./lib/utils.js');
var ytdlUtils = require('./lib/ytdl-utils.js');
var ffmpegUtils = require('./lib/ffmpeg-utils.js');

var Q = require('q');
var moment = require('moment');
var fs = require('fs');

var telegram_bot_key;
try {
  telegram_bot_key = fs.readFileSync('./telegram_bot_key.key', 'utf8');
  console.log('Telegram bot key has read.');
} catch (e) {
  console.log('The telegram bot key file not found: "telegram_bot_key.key"');
  return;
}

var tg = require('telegram-node-bot')(telegram_bot_key);

utils.logger.info('Telegram video to bot listener started...');
console.log('Telegram video to bot listener started...');

fs.existsSync(utils.defaults.videoBowl) || fs.mkdirSync(utils.defaults.videoBowl);

// Triggers with two duration values. Crop the video from start to to value.
tg.router.when(['/gift :url :start :to'], 'GiftControllerMiddleRange')
tg.controller('GiftControllerMiddleRange', ($) => {
  tg.for('/gift :url :start :to', ($) => {
    var url = $.query.url;
    var start = $.query.start;
    var to = $.query.to;

    giftController($, url, start, to);
  });
});

// Triggers with one duration value and decices where from it will crop the
// video whether beginning or end.
tg.router.when(['/gift :url :duration'], 'GiftControllerEdgeRange')
tg.controller('GiftControllerEdgeRange', ($) => {
  tg.for('/gift :url :duration', ($) => {
    var url = $.query.url;
    var duration = $.query.duration;

    var start, to;

    if (isNaN(duration)) {
      start = duration;
      to = utils.defaults.toAsSec;
    } else {
      start = '00:00:00';
      to = Number(duration);
    }

    giftController($, url, start, to);
  });
});

var giftController = function($, url, start, to) {
  utils.logger.info('/giftube called with the parameters url:', url, 'start:', start, 'to:', to);

  try {
    utils.validateStartParam(start);
    utils.validateToParam(to);
  } catch (err) {
    var message = err.message + ' Please try again.';
    $.sendMessage(message);

    return;
  }

  // Get information of the video.
  ytdlUtils.videoInfo(url).then(function(videoInfo) {

    try {
      // Checks values of times and normalizes.
      videoInfo.durations = utils.normalizeDurations(videoInfo.duration, start, to);
    } catch (err) {
      var message = err.message + ' Please try again.';
      $.sendMessage(message);

      return;
    }

    // Get all suitable formats of the video.
    ytdlUtils.getSuitableVideoFormat(url).then(function(resolution) {

      // Get real streaming url of the remote video file.
      ytdlUtils.getRealVideoUrl(url, videoInfo.durations.start, resolution).then(function(realUrl) {

        // Crop a part of the video over the remote streaming url.
        ffmpegUtils.cropVideoFromUrl(videoInfo.durations.start, videoInfo.durations.to, resolution, realUrl).then(function(croppedFile) {
          utils.logger.info('Video successfully cropped: ', croppedFile);

          // Converting "to" seconds to duration to show end time.
          var startAsSec = moment.duration(videoInfo.durations.start).asSeconds();
          var toDuration = moment.utc((startAsSec + videoInfo.durations.to) * 1000).format("HH:mm:ss");

          // Prepare video information to show with the video as a caption.
          var durationCaption = 'Duration: ' + videoInfo.duration + '\n';
          var betweenCaption = videoInfo.durations.start + ' to ' + toDuration;
          var titleCaption = utils.trunc('Title: ' + videoInfo.title, (199 - durationCaption.length - betweenCaption.length)) + '\n';

          var caption = durationCaption + titleCaption + betweenCaption;

          // Create a stream from the downloaded video file.
          var videoStream = fs.createReadStream(croppedFile);

          // Send the strem of the cropped video file to the current message timelime.
          $.sendVideo(videoStream, {
            caption: caption
          }, function(body, output) {
            exec('rm -rf ' + croppedFile);
          });
        }, function(error) {
          var error = 'Error occured while converting the video!';
          utils.logger.error(error);

          var message = error + ' Please try again.';
          $.sendMessage(message);
        });

      }, function(error) {
        var error = 'Error occured while converting the video!';
        utils.logger.error(error);

        var message = error + ' Please try again.';
        $.sendMessage(message);
      });

    }, function(error) {
      var error = 'Error occured while converting the video!';
      utils.logger.error(error);

      var message = error + ' Please try again.';
      $.sendMessage(message);
    });

  }, function(error) {
    var error = 'The video does not exist! Check the url that you passed.';
    utils.logger.error(error);

    var message = error + ' Please try again.';
    $.sendMessage(message);
  });
};
