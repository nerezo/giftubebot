'use strict'

var moment = require('moment');
var fs = require('fs');
var log4js = require('log4js');

var defaults = {
  videoBowl: __dirname + '/../videos',
  videoFormat: 18,
  loggerLevel: 'TRACE',
  toAsSec: 5,
  maxToAsSec: 60,
  cropFilePostfix: 'crop',
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
  fs.existsSync(__dirname + '/../log/') || mkdirSync(__dirname + '/../log/');

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
     * head of the string sometimes at hour or minute places.
     *
     * formatDurationString('8') -> 00:00:08
     * formatDurationString('18') -> 00:00:18
     * formatDurationString('4:38') -> 00:04:38
     * formatDurationString('04:38') -> 00:04:38
     * formatDurationString('14:38') -> 00:14:38
     * formatDurationString('1:14:00') -> 01:14:08
     * formatDurationString('01:14:00') -> 01:14:08
     */
    formatDurationString: function(duration) {
      giftubeLogger.trace('ENTER - Format duration string:', duration);

      if (typeof duration === 'undefined') {
        throw (new Error('duration parameter is mandatory!'));
      }

      if (!isNaN(duration)) {
        // Is numeric
        duration = duration.toString();
      } else if (duration.indexOf(':') === -1) {
        // Is not a number and a duration string
        throw (new Error('duration parameter should be a number or a duration string!'));
      }

      var durationSplitted = duration.split(':').reverse();
      var newDurationArray = [];

      for (var i = 0; i < 3; i++) {
        if (durationSplitted[i]) {
          newDurationArray.push((durationSplitted[i].length < 2 ? '0' + durationSplitted[i] : durationSplitted[i]));
        } else {
          newDurationArray.push('00');
        }
      }

      var newDurationString = newDurationArray.reverse().join(':');

      giftubeLogger.trace('EXIT - Format duration string:', newDurationString);

      return newDurationString;
    },
    // Checks value of passed start parameter.
    validateStartParam: function(start) {
      if (typeof start === 'undefined') {
        throw (new Error('start parameter is mandatory!'));
      }

      // If start value is not a string or wrong formatted duration string throwing an exception.
      if (typeof start !== 'string' || start.length !== 8 || (start[2] !== ':' && start[5] !== ':')) {
        var message = 'start time should be in this format "hh:mm:ss". i.e. "00:12:30".';

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
    // Returns an object that contains the duration strings formatted as "hh:mm:ss" i.e. "00:12:35".
    normalizeDurations: function(duration, start, to) {
      var durationAsSec = moment.duration(duration).asSeconds();
      var startAsSec = moment.duration(start).asSeconds();
      var toAsSec = (isNaN(to) ? moment.duration(to).asSeconds() - startAsSec : Number(to));

      if (startAsSec >= durationAsSec) {
        throw (new Error('Please give a start time between the duration of the video!'));

        return;
      } else if (toAsSec > defaults.maxToAsSec) {
        toAsSec = defaults.maxToAsSec;
      }

      return {
        duration: moment.utc(durationAsSec * 1000).format("HH:mm:ss"),
        start: moment.utc(startAsSec * 1000).format("HH:mm:ss"),
        to: toAsSec
      };
    },
    trunc: function(str, n) {
      return (str.length > n) ? str.substr(0, n - 1) + '…' : str;
    }
  }
}

module.exports = utils();
