'use strict'

var fs = require('fs');
var utils = require('./utils.js');
var ytdl = require('youtube-dl');
var Q = require('q');

var youtubeInfo = function (url) {
    utils.logger.trace('ENTER - Get video url info:', url);

    var deferred = Q.defer();

    ytdl.getInfo(url, function (err, info) {
        if (err) {
            utils.logger.warn('Error occurred:', err, 'video url:', url);

            deferred.reject(err);
        } else {
            var res = {
                url: info.webpage_url,
                title: info.title,
                duration: utils.formatDurationString(info.duration)
            };

            utils.logger.info('Video information:', res);

            utils.logger.trace('EXIT - Get video url info:', info.webpage_url, 'title:', info.title);

            deferred.resolve(res);
        }
    });

    return deferred.promise;
};
module.exports.youtubeInfo = youtubeInfo;

// This wrapper created in order to mock the ytdl constructor.
var ytdlWrapper = function (url, args) {
    var video = ytdl(url, args);

    return video;
}
module.exports.ytdlWrapper = ytdlWrapper;

var youtubeDownload = function (file, format, url) {
    utils.logger.trace('ENTER - Download video:', url, 'file:', file, 'format:', format);

    var deferred = Q.defer();

    var video = module.exports.ytdlWrapper(url, ['--format', format]);

    video.on('error', function error(err) {
        utils.logger.warn('Error occurred:', err, 'video url:', url);

        deferred.reject(err);
    });

    video.on('end', function () {
        utils.logger.info('Video downloaded:', url);

        utils.logger.trace('EXIT - Download video:', url, 'file:', file, 'format:', format);

        deferred.resolve(file);
    });

    video.pipe(fs.createWriteStream(file));

    return deferred.promise;
};
module.exports.youtubeDownload = youtubeDownload;
