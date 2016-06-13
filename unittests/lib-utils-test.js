var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var utils = require('./../lib/utils.js');

describe('utils.js - getNanoTime() unit tests', function() {
  it('getNanoTime() should return a long number', function() {
    var nanoTime = utils.getNanoTime();
    expect(nanoTime).to.be.a('number');
    expect(String(nanoTime)).to.have.lengthOf(13);
  });
});

describe('utils.js - formatDurationString(<duration>) unit tests', function() {
  it('formatDurationString(<duration>) should throw exception if no items are passed in', function() {
    var fn = function() {
      utils.formatDurationString();
    }
    expect(fn).to.throw(Error, /duration parameter is mandatory!/);
  });
  it('formatDurationString(<duration>) should throw exception if passed item is not a number and a duration string', function() {
    var fn = function() {
      utils.formatDurationString('ab');
    }
    expect(fn).to.throw(Error, /duration parameter should be a number or a duration string!/);
  });
  it('formatDurationString(<duration>) should return a duration string formatted as 00:00:12 if only second is passed in as 12', function() {
    var formattedDurationString = utils.formatDurationString('12');
    expect(formattedDurationString).to.equal('00:00:12');
  });
  it('formatDurationString(<duration>) should return a duration string formatted as 00:12:34 if minute and second are passed in as 12:34', function() {
    var formattedDurationString = utils.formatDurationString('12:34');
    expect(formattedDurationString).to.equal('00:12:34');
  });
  it('formatDurationString(<duration>) should return a duration string formatted as 12:34:56 if hour, minute and second are passed in as 12:34:56', function() {
    var formattedDurationString = utils.formatDurationString('12:34:56');
    expect(formattedDurationString).to.equal('12:34:56');
  });
  it('formatDurationString(<duration>) should return a duration string formatted as 01:02:03 if hour, minute and second are passed in as 1:2:3', function() {
    var formattedDurationString = utils.formatDurationString('1:2:3');
    expect(formattedDurationString).to.equal('01:02:03');
  });
});

describe('utils.js - validateStartParam(<start>) unit tests', function() {
  it('validateStartParam(<start>) should throw exception if no items are passed in', function() {
    var fn = function() {
      utils.validateStartParam();
    }
    expect(fn).to.throw(Error, /start parameter is mandatory!/);
  });
  it('validateStartParam(<start>) should throw exception if numeric value passed in', function() {
    var fn = function() {
      utils.validateStartParam(12);
    }
    expect(fn).to.throw(Error, /start time should be in this format "hh:mm:ss". i.e. "00:12:30"./);
  });
  it('validateStartParam(<start>) should throw exception if an invalid string passed in', function() {
    var fn = function() {
      utils.validateStartParam('as');
    }
    expect(fn).to.throw(Error, /start time should be in this format "hh:mm:ss". i.e. "00:12:30"./);
  });
  it('validateStartParam(<start>) should throw exception if a wrong formatted duration string passed in', function() {
    var fn = function() {
      utils.validateStartParam('123:33::2');
    }
    expect(fn).to.throw(Error, /start time should be in this format "hh:mm:ss". i.e. "00:12:30"./);
  });
  it('validateStartParam(<start>) should be okay if a valid duration string passed in', function() {
    var fn = function() {
      utils.validateStartParam('12:34:56');
    }
    expect(fn).to.not.throw(Error);
  });
});

describe('utils.js - validateToParam(<to>) unit tests', function() {
  it('validateToParam(<to>) should throw exception if no items are passed in', function() {
    var fn = function() {
      utils.validateToParam();
    }
    expect(fn).to.throw(Error, /second parameter is mandatory!/);
  });
  it('validateToParam(<to>) should throw exception if a string passed in', function() {
    var fn = function() {
      utils.validateToParam('as');
    }
    expect(fn).to.throw(Error, /second value should be a numeric value./);
  });
  it('validateToParam(<to>) should throw exception if 0 passed in', function() {
    var fn = function() {
      utils.validateToParam(0);
    }
    expect(fn).to.throw(Error, /second value should be greater than 0./);
  });
  it('validateToParam(<to>) should be okay if a valid number passed in', function() {
    var fn = function() {
      utils.validateToParam(12);
    }
    expect(fn).to.not.throw(Error);
  });
});
