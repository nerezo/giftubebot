'use strict'

var tg = require('telegram-node-bot')('<telegram-bot-key>');
var fs = require('fs');
var Q = require('q');
var moment = require('moment');

var utils = require('./lib/utils.js');
var ytdlUtils = require('./lib/ytdl-utils.js');
var ffmpegUtils = require('./lib/ffmpeg-utils.js');

utils.logger.info('Bot listener started...');

console.log('Started...');
console.log('Videos folder: ', utils.defaults.videoBowl);

fs.existsSync(utils.defaults.videoBowl) || fs.mkdirSync(utils.defaults.videoBowl);

tg.router.
    when(['/giftube :url :start :to'], 'GifTubeController')

tg.controller('GifTubeController', ($) => {

    tg.for('/giftube :url :start :to', ($) => {
        var url = $.query.url;
        var start = $.query.start;
        var to = $.query.to;

        utils.logger.info('/giftube called with the parameters url:', url, 'start:', start, 'to:', to);

        try {
            utils.validateStartParam(start);
            utils.validateToParam(to);
        } catch(err) {
            $.sendMessage(err)

            return;
        }

        ytdlUtils.youtubeInfo(url).then(function(result) {
            $.sendMessage('Video duration: ' + result.duration + '\nTitle: ' + result.title);

            var durations;
            try {
                // Checks values of times and normalizes.
                durations = utils.normalizeDurations(result.duration, start, to);
            } catch (err) {
                $.sendMessage(err);

                return;
            }

            var nanotime = utils.getNanoTime();
            var file = utils.defaults.videoBowl + '/' + nanotime + '.mp4';
            ytdlUtils.youtubeDownload(file, utils.defaults.videoFormat, url).then(function (result) {
                ffmpegUtils.cropVideo(file, durations.start, durations.to).then(function (croppedFile) {
                    utils.logger.info('Video successfully cropped: ', croppedFile);

                    // Converting "to" seconds to duration to show end time.
                    var startAsSec = moment.duration(durations.start).asSeconds();
                    var toDuration = moment.utc((startAsSec + durations.to) * 1000).format("HH:mm:ss");
                    $.sendMessage(durations.start + ' to ' + toDuration);

                    var videoStream = fs.createReadStream(croppedFile);

                    $.sendVideo(videoStream, function (body, output) {
                        exec('rm -rf ' + file + ' ' + croppedFile);
                    });
                }, function() {
                    utils.logger.error('Error occured while converting the video.!');

                    $.sendMessage('Error occured while converting the video! Please try again.')

                    return;
                });
            }, function(error) {
                utils.logger.error('Error occured while downloading the video.!');

                $.sendMessage('Error occured while downloading the video! Please try again.')

                return;
            });
        }, function(error) {
            utils.logger.error('The video does not exist!');

            $.sendMessage('The video does not exist! Please check the url that you passed.')

            return;
        });
    });

});
