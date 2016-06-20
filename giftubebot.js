'use strict'

var utils = require('./lib/utils.js');
var ytdlUtils = require('./lib/ytdl-utils.js');
var ffmpegUtils = require('./lib/ffmpeg-utils.js');

var Q = require('q');
var moment = require('moment');
var fs = require('fs');

var telegram_bot_key;
try {
  telegram_bot_key = fs.readFileSync('./telegram_bot_key.key', 'utf8').trim();
  console.log('Telegram bot key has read.');
} catch (e) {
  console.log('The telegram bot key file not found: "telegram_bot_key.key"');
  return;
}

var GENERIC_ERROR_MESSAGE = 'Error occured while converting the video! Please try again.\n/gifthelp';

// The command to be use on telegram to run video cropping.
var command = '/gift';

var tg = require('telegram-node-bot')(telegram_bot_key);

utils.logger.info('Telegram video to bot listener started...');
console.log('Telegram video to bot listener started...');

fs.existsSync(utils.defaults.videoBowl) || fs.mkdirSync(utils.defaults.videoBowl);

var startText = fs.readFileSync('./texts/startTexts.txt', 'utf8');
var helpText = fs.readFileSync('./texts/helpTexts.txt', 'utf8');

// Help method to give usage information.
tg.router.when(['/start'], 'GiftControllerStart')
tg.controller('GiftControllerStart', ($) => {
  utils.logger.trace('GiftControllerStart');

  tg.for('/start', ($) => {
    var message = 'You can use below commands:\n\n';
    message += '/gift - crop videos from url with time parmaters';
    message += '/gifthelp - show description and usage information';

    var opts = {
      disable_web_page_preview: true
    };
    $.sendMessage(startText, opts);
  });

});

// Help method to give usage information.
tg.router.when(['/gifthelp'], 'GiftControllerHelp')
tg.controller('GiftControllerHelp', ($) => {
  utils.logger.trace('GiftControllerHelp');

  tg.for('/gifthelp', ($) => {
    var message = helpText + '\n\n' + startText;

    $.sendMessage(message);
  });

});

// Triggers with two duration values. Crop the video from start to to value.
tg.router.when([command + ' :url :start :to'], 'GiftControllerMiddleRange')
tg.controller('GiftControllerMiddleRange', ($) => {
  utils.logger.trace('GiftControllerMiddleRange');

  tg.for(command + ' :url :start :to', ($) => {
    giftController($, $.query.url, $.query.start, $.query.to, false);
  });

});
// Triggers with two duration values. Crop the video from start to to value. Shows information if last parameter sends as '--show-info'.
tg.router.when([command + ' :url :start :to :showInfo'], 'GiftControllerMiddleRangeShowInfo')
tg.controller('GiftControllerMiddleRangeShowInfo', ($) => {
  utils.logger.trace('GiftControllerMiddleRangeShowInfo');

  tg.for(command + ' :url :start :to :showInfo', ($) => {
    var showInfo = ($.query.showInfo === 'show-info');

    giftController($, $.query.url, $.query.start, $.query.to, showInfo);
  });

});

// Triggers with one duration value and decices where from it will crop the
// video whether beginning or end.
tg.router.when([command + ' :url :duration'], 'GiftControllerEdgeRange')
tg.controller('GiftControllerEdgeRange', ($) => {
  utils.logger.trace('GiftControllerEdgeRange');

  tg.for(command + ' :url :duration', ($) => {
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

    giftController($, url, start, to, false);
  });

});

var giftController = function($, url, start, to, showInfo) {
  utils.logger.info('/gift called with the parameters url:', url, 'start:', start, 'to:', to, 'showInfo:', showInfo);

  if (url.indexOf('www\.youtu\.be')) {
    url = url.replace(/www\./g, '');
  }

  try {
    start = utils.formatDurationString(start);

    utils.validateStartParam(start);
    utils.validateToParam(to);
  } catch (err) {
    var message = err.message + ' Please try again.\ngifthelp';
    $.sendMessage(message);

    return;
  }

  // Get information of the video.
  ytdlUtils.getVideoInfo(url).then(function(videoInfo) {

    try {
      // Checks values of times and normalizes.
      videoInfo.times = utils.normalizeDurations(videoInfo.duration, start, to);
    } catch (err) {
      var message = err.message + ' Please try again.\ngifthelp';
      $.sendMessage(message);

      return;
    }

    // Get all suitable formats of the video.
    ytdlUtils.getSuitableVideoFormat(url).then(function(resolution) {

      // Get real streaming url of the remote video file.
      ytdlUtils.getRealVideoUrl(url, videoInfo.times.start, resolution).then(function(realUrl) {

        // Crop a part of the video over the remote streaming url.
        ffmpegUtils.cropVideoFromUrl(videoInfo.times.start, videoInfo.times.to, resolution, realUrl, videoInfo.id).then(function(croppedFilename) {
          utils.logger.info('Video successfully cropped:', croppedFilename);

          // Embed logo to the cropped video.
          ffmpegUtils.embedLogoAsWatermark(croppedFilename, videoInfo.extractor).then(function(finalFilename) {
            utils.logger.info('Image successfully embedded to the video:', finalFilename);

            // Create a stream from the downloaded video file.
            var finalFileWithPath = utils.defaults.videoBowl + '/' + finalFilename;
            var videoStream = fs.createReadStream(finalFileWithPath);

            var videoOption = {};
            if (showInfo) {
              // Converting "to" seconds to duration to show end time.
              var durationAsSec = moment.duration(videoInfo.duration).asSeconds();
              var startAsSec = moment.duration(videoInfo.times.start).asSeconds();
              var toAsSec = startAsSec + videoInfo.times.to;

              if (durationAsSec === 0) {
                videoInfo.duration = 'N/A';
              } else {
                toAsSec = ((toAsSec > durationAsSec) ? durationAsSec : toAsSec);
              }

              var toDuration = moment.utc(toAsSec * 1000).format("HH:mm:ss");

              // Prepare video information to show with the video as a caption.
              var durationCaption = 'Duration: ' + videoInfo.duration + '\n';
              var betweenCaption = videoInfo.times.start + ' to ' + toDuration;
              var titleCaption = utils.trunc('Title: ' + videoInfo.title, (199 - durationCaption.length - betweenCaption.length)) + '\n';

              var caption = durationCaption + titleCaption + betweenCaption;

              videoOption.caption = caption;
            }

            // Send the strem of the cropped video file to the current message timelime.
            $.sendVideo(videoStream, videoOption, function(body, output) {
              if (body.ok) {
                utils.logger.info('Video successfully sent. message_id:', body.result.message_id, ', chat_id:', body.result.chat.id, ', first_name:', body.result.chat.first_name, ', username:', body.result.chat.username);
              } else {
                utils.logger.warn('Video cannot be sent!');
              }
            });
          }, function(error) {
            utils.logger.error(error);

            $.sendMessage(GENERIC_ERROR_MESSAGE);
          });
        }, function(error) {
          utils.logger.error(error);

          $.sendMessage(GENERIC_ERROR_MESSAGE);
        });
      }, function(error) {
        utils.logger.error(error);

        $.sendMessage(GENERIC_ERROR_MESSAGE);
      });
    }, function(error) {
      utils.logger.error(error);

      var message = GENERIC_ERROR_MESSAGE;
      if (String(error).indexOf('exist or is private' > -1)) {
        message = 'YouTube said: The playlist doesn\'t exist or is private.';
      }

      $.sendMessage(message);
    });
  }, function(error) {
    utils.logger.error(error);

    if (String(error).indexOf('Please sign in') > -1) {
      message = 'YouTube said: This video requires authentication to view.'
    } else if (String(error).indexOf('available') > -1) {
      message = 'YouTube said: The uploader has not made this video available in your country.'
    } else {
      message = 'The video does not exist! Check the url that you passed.\n/gifthelp';
    }

    $.sendMessage(message);
  });
};
