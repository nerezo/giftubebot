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

// The command to be use on telegram to run video cropping.
var command = '/gift';

var tg = require('telegram-node-bot')(telegram_bot_key);

utils.logger.info('Telegram video to bot listener started...');
console.log('Telegram video to bot listener started...');

fs.existsSync(utils.defaults.videoBowl) || fs.mkdirSync(utils.defaults.videoBowl);

var startMessage = 'You can use below commands:\n\n' +
  '/gift - crop videos from url with time parmaters\n' +
  '/gifthelp - show description and usage information';

var helpMessage = 'Crops specified part of YouTube or Vimeo videos and shows on the timeline.\n\n' +
  'Usage: /gift <youtube_url> <start_time> <second>\n\n' +
  'e.g.\n' +
  'From the start time till the second:\n' +
  '/gift https://www.youtube.com/watch?v=QPFuwEqBgDQ 00:00:04 5\n\n' +
  'From the start time till the default second (5):\n' +
  '/gift https://www.youtube.com/watch?v=QPFuwEqBgDQ 00:00:04\n\n' +
  'From the beginning of the video till the second:\n' +
  '/gift https://www.youtube.com/watch?v=QPFuwEqBgDQ 5\n\n' +
  'If the second grather than 60 then crops only 60 seconds of the video.\n\n' +
  'Sample start times: 8, 1:23, 01:23, 1:23:45, 01:23:45. Durations can be used with dot charachters too like 1.23 or 02.34.\n\n' +
  'Show Information: The video informations can be seen with "show-info" parameter with all other parameters as below\n' +
  '/gift https://www.youtube.com/watch?v=QPFuwEqBgDQ 00:00:04 5 show-info';

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
    //$.sendMessage(startMessage, opts);
    tg.sendMessage($.chatId, startMessage, opts);
  });

});

// Help method to give usage information.
tg.router.when(['/gifthelp'], 'GiftControllerHelp')
tg.controller('GiftControllerHelp', ($) => {
  utils.logger.trace('GiftControllerHelp');

  tg.for('/gifthelp', ($) => {
    var message = helpMessage + '\n\n' + startMessage;

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

  try {
    start = utils.formatDurationString(start);

    utils.validateStartParam(start);
    utils.validateToParam(to);
  } catch (err) {
    var message = err.message + ' Please try again.';
    $.sendMessage(message);

    return;
  }

  // Get information of the video.
  ytdlUtils.getVideoInfo(url).then(function(videoInfo) {

    try {
      // Checks values of times and normalizes.
      videoInfo.times = utils.normalizeDurations(videoInfo.duration, start, to);
    } catch (err) {
      var message = err.message + ' Please try again.';
      $.sendMessage(message);

      return;
    }

    // Get all suitable formats of the video.
    ytdlUtils.getSuitableVideoFormat(url).then(function(resolution) {

      // Get real streaming url of the remote video file.
      ytdlUtils.getRealVideoUrl(url, videoInfo.times.start, resolution).then(function(realUrl) {

        // Crop a part of the video over the remote streaming url.
        ffmpegUtils.cropVideoFromUrl(videoInfo.times.start, videoInfo.times.to, resolution, realUrl, videoInfo.id).then(function(croppedFilename) {
          utils.logger.log('Video successfully cropped: ', croppedFilename);

          // Embed logo to the cropped video.
          ffmpegUtils.embedLogoAsWatermark(croppedFilename).then(function(finalFilename) {
            utils.logger.log('Image successfully embedded to the video: ', finalFilename);

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

            $.sendMessage('Error occured while converting the video! Please try again.');
          });
        }, function(error) {
          utils.logger.error(error);

          $.sendMessage('Error occured while converting the video! Please try again.');
        });
      }, function(error) {
        utils.logger.error(error);

        $.sendMessage('Error occured while converting the video! Please try again.');
      });
    }, function(error) {
      utils.logger.error(error);

      $.sendMessage('Error occured while converting the video! Please try again.');
    });
  }, function(error) {
    utils.logger.error(error);

    if (String(error).indexOf('Please sign in') > -1) {
      message = 'YouTube said: This video requires authentication to view.'
    } else {
      message = 'The video does not exist! Check the url that you passed.';
    }

    $.sendMessage(message);
  });
};
