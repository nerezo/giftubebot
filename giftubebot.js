'use strict'

const Telegram = require('telegram-node-bot');
const TelegramBaseController = Telegram.TelegramBaseController;
const TextCommand = Telegram.TextCommand;
const RegexpCommand = Telegram.RegexpCommand;
const minimist = require('minimist');
const s = require("underscore.string");

const utils = require('./lib/utils.js');
const ytdlUtils = require('./lib/ytdl-utils.js');
const ffmpegUtils = require('./lib/ffmpeg-utils.js');

const Q = require('q');
const moment = require('moment');
const fs = require('fs');

var telegram_bot_key;
try {
  telegram_bot_key = fs.readFileSync('./telegram_bot_key.key', 'utf8').trim();
  console.log('Telegram bot key has read.');
} catch (e) {
  console.log('The telegram bot key file not found: "telegram_bot_key.key"');
  return;
}

var GENERIC_ERROR_MESSAGE = 'Error occured while converting the video! Please try again.\n/gifthelp';

const tg = new Telegram.Telegram(telegram_bot_key, {
    webAdmin: {
        port: 1234,
        host: 'localhost'
    }
});

utils.logger.info('Telegram video to gif bot started...');
console.log('Telegram video to gif bot started...');

fs.existsSync(utils.defaults.videoBowl) || fs.mkdirSync(utils.defaults.videoBowl);

var startText = fs.readFileSync('./texts/startTexts.txt', 'utf8');
var helpText = fs.readFileSync('./texts/helpTexts.txt', 'utf8');

// Help method to give usage information.
class GiftStartController extends TelegramBaseController {
  /**
   * @param {Scope} $
   */
  startHandler($) {
    utils.logger.trace('GiftStartController');

    var message = 'You can use below commands:\n\n';
    message += '/gift - crop videos from url with time parmaters';
    message += '/gifthelp - show description and usage information';

    var opts = {
      disable_web_page_preview: true
    };
    $.sendMessage(startText, opts);
  }

  get routes() {
    return {
      'startCommand': 'startHandler'
    }
  }
}
tg.router.when(new TextCommand('/start', 'startCommand'), new GiftStartController());

// Help method to give usage information.
class GiftHelpController extends TelegramBaseController {
  /**
   * @param {Scope} $
   */
  gifthelpHandler($) {
    utils.logger.trace('GiftHelpController');

    var message = 'You can use below commands:\n\n';
    message += '/gift - crop videos from url with time parmaters';
    message += '/gifthelp - show description and usage information';

    var message = helpText + '\n\n' + startText;

    var opts = {
      disable_web_page_preview: true
    };
    $.sendMessage(message, opts);
  }

  get routes() {
    return {
      'gifthelpCommand': 'gifthelpHandler'
    }
  }
}
tg.router.when(new TextCommand('/gifthelp', 'gifthelpCommand'), new GiftHelpController());

// A short-cut to call help controller.
const callHelp = function ($) {
  (new GiftHelpController()).gifthelpHandler($);
}

// Triggers with url, only duration or start with duration values. Crop the video from start to to value.
class GiftCropController extends TelegramBaseController {
  /**
   * @param {Scope} $
   */
  giftHandler($) {
    utils.logger.trace('GiftCropController');

    var errorMessage = undefined;

    var argvArray = s($.message.text).trim().clean().value().split(' ');
    var argv = minimist(argvArray.slice(1));

    if (argv._.length > 4 || argv._.length < 2) {
      callHelp($);
      return;
    }

    var url = argv._[0];
    var start = '';
    var to = '';
    if (argv._.length > 2) {
      start = argv._[1]; // Use second parameter as start value
      to = argv._[2]; // Use third parameter as duration value
    } else {
      start = '00:00:00'; // Starts from the beginning of the video
      to = argv._[1]; // Use second parameter as duration value
    }

    var showInfo = (argv._.indexOf('show-info') !== -1);

    giftController($, url, start, to, showInfo);
  }

  get routes() {
    return {
      'giftCommand': 'giftHandler'
    }
  }
}
tg.router.when(new TextCommand('/gift', 'giftCommand'), new GiftCropController());

// Main method
var giftController = function($, url, start, to, showInfo) {
  utils.logger.info('/gift called with the parameters url:', url, 'start:', start, 'to:', to, 'showInfo:', showInfo);

  if (url.indexOf('www\.youtu\.be')) {
    url = url.replace(/www\./g, '');
  }

  try {
    start = utils.formatDurationString(start);

    utils.validateStartParam(start);
    utils.validateToParam(to);

    // Format to value after validation since we need this value as a duration value.
    to = utils.formatDurationString(to);
  } catch (err) {
    var message = err.message + ' Please try again.\n/gifthelp';
    $.sendMessage(message);

    return;
  }

  // Get information of the video.
  ytdlUtils.getVideoInfo(url).then(function(videoInfo) {

    try {
      // Checks values of times and normalizes.
      videoInfo.times = utils.normalizeDurations(videoInfo.duration, start, to);
      utils.logger.debug('videoInfo.times: ', videoInfo.times);
    } catch (err) {
      var message = err.message + ' Please try again.\n/gifthelp';
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
              // Converting "to" milliseconds to duration to show end time.
              var durationAsMsec = moment.duration(videoInfo.duration).asMilliseconds();
              var startAsMsec = moment.duration(videoInfo.times.start).asMilliseconds();
              var toAsMsec = startAsMsec + moment.duration(videoInfo.times.to).asMilliseconds();

              if (durationAsMsec === 0) {
                videoInfo.duration = 'N/A';
              } else {
                toAsMsec = ((toAsMsec > durationAsMsec) ? durationAsMsec : toAsMsec);
              }

              var toDuration = moment.utc(toAsMsec).format("HH:mm:ss.SSS");

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
