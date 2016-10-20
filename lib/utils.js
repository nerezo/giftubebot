'use strict'

const moment = require('moment');
const fs = require('fs');
const log4js = require('log4js');
const crypto = require('crypto');
const s = require("underscore.string");

var defaults = {
  videoBowl: __dirname + '/../videos',
  logBowl: __dirname + '/../log',
  imageDir: __dirname + '/../img',
  watermarkImage: 'logo_trans_35x31.png',
  videoFormat: 18,
  loggerLevel: 'INFO',
  toAsMsec: 5 * 1000,
  maxToAsMsec: 30 * 1000,
  cropFilePostfix: 'crop',
  finalFilePostfix: 'final',
};

var mkdirSync = function(path) {
  try {
    fs.mkdirSync(path);
  } catch (e) {
    if (e.code != 'EEXIST') throw e;
  }
};

var utils = function() {
  var mainDirName = __dirname

  // Checks the directory named 'log' and creates if no exist.
  fs.existsSync(defaults.logBowl) || mkdirSync(defaults.logBowl);

  // Checks the directory named 'video' and creates if no exist.
  fs.existsSync(defaults.videoBowl) || fs.mkdirSync(defaults.videoBowl);

  // Configure log4js with the configuration file.
  log4js.configure('log4js_configuration.json', {
    cwd: __dirname + '/../'
  });

  // Get logger and set level of it.
  var giftubeLogger = log4js.getLogger('logger');
  giftubeLogger.setLevel(defaults.loggerLevel);

  return {
    // Logger util.
    logger: giftubeLogger,
    // Default values.
    defaults: defaults,
    // Gets long nanotime value of current datetime.
    getNanoTime: function() {
      return new Date().getTime();
    },
    /*
     * Formats the found video length string by youtube-dl as 'HH:mm:ss' so it would not containing zero values
     * head of the string sometimes at hour or minute places. It supports dot signs instead colons.
     *
     * formatDurationString('8') -> 00:00:08
     * formatDurationString('18') -> 00:00:18
     * formatDurationString('4:38') -> 00:04:38
     * formatDurationString('04:38') -> 00:04:38
     * formatDurationString('14:38') -> 00:14:38
     * formatDurationString('1:14:00') -> 01:14:08
     * formatDurationString('1:14:00.123') -> 01:14:08.123
     * formatDurationString('01:14:00') -> 01:14:08
     * formatDurationString('01:14:00.123') -> 01:14:08.123
     */
    formatDurationString: function(duration) {
      giftubeLogger.trace('ENTER - Format duration string:', duration);

      if (typeof duration === 'undefined') {
        throw (new Error('duration parameter is mandatory!'));
      }

      // Is numeric
      if (!isNaN(parseFloat(duration)) && isFinite(duration)) {
        // Convert to string.
        duration = duration.toString();
      } else if (duration.indexOf(':') === -1) {
        // Is not a number and a duration string
        throw (new Error('duration parameter should be a number or a standard duration string! e.g. 01:02:03.123.'));
      }

      var millisecond = '';
      // Add empty millisecond value end of the duration if there is no.
      if (duration.indexOf('.') === -1) {
        millisecond = '000';
      } else {
        millisecond = s.pad(duration.split('.')[1], 3, '0', 'right');
      }

      var durationSplitted = duration.split('.')[0].split(':').reverse();

      var newDurationArray = [];

      for (var i = 0; i < 3; i++) {
        if (durationSplitted[i]) {
          newDurationArray.push((durationSplitted[i].length < 2 ? '0' + durationSplitted[i] : durationSplitted[i]));
        } else {
          newDurationArray.push('00');
        }
      }

      var newDurationString = newDurationArray.reverse().join(':') + '.' + millisecond;

      giftubeLogger.trace('EXIT - Format duration string:', newDurationString);

      return newDurationString;
    },
    // Checks value of passed start parameter.
    validateStartParam: function(start) {
      if (typeof start === 'undefined') {
        throw (new Error('start parameter is mandatory!'));
      }

      // If start value is not a string or wrong formatted duration string throwing an exception.
      if (typeof start !== 'string' || start.length !== 12 || (start[2] !== ':' && start[5] !== ':' && start[8] !== '.')) {
        var message = 'start time should be in this format "hh:mm:ss" or "hh:mm:ss.sss". i.e. "00:12:30" or "00:12:30.456".';

        giftubeLogger.warn(message + ' start:', start);

        throw (new Error(message));
      }
    },
    // Checks value of passed second parameter.
    validateToParam: function(to) {
      if (typeof to === 'undefined') {
        throw (new Error('second parameter is mandatory!'));
      }

      // If second value is not a number throwing an exception.
      var message = undefined;
      if (isNaN(to)) {
        message = 'second value should be a numeric value.';
      } else if (Number(to) === 0) {
        message = 'second value should be greater than 0.';
      }

      if (message) {
        giftubeLogger.warn(message + ' to:', to);

        throw (new Error(message));
      }
    },
    // Compares range parameters with duration of videoes and normalizes all of duration values.
    // Returns an object that contains the duration strings formatted as "hh:mm:ss" or "hh:mm:ss.sss" i.e. "00:12:35" or "00:12:35.456".
    normalizeDurations: function(duration, start, to) {
      var durationAsMsec = moment.duration(duration).asMilliseconds();
      var startAsMsec = moment.duration(start).asMilliseconds();
      var toAsMsec = moment.duration(to).asMilliseconds();

      if (durationAsMsec > 0 && startAsMsec >= durationAsMsec) {
        throw (new Error('Please give a start time in the duration of the video!'));
      }

      if (toAsMsec > defaults.maxToAsMsec) {
        toAsMsec = defaults.maxToAsMsec;
      }

      return {
        duration: moment.utc(durationAsMsec).format("HH:mm:ss.SSS"),
        start: moment.utc(startAsMsec).format("HH:mm:ss.SSS"),
        to: moment.utc(toAsMsec).format("HH:mm:ss.SSS")
      };
    },
    trunc: function(str, n) {
      return (str.length > n) ? str.substr(0, n - 1) + '…' : str;
    },
    md5: function (str) {
      return crypto.createHash('md5').update(str).digest('hex');
    }
  }
}

module.exports = utils();
