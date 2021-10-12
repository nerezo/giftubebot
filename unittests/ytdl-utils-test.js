var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var sinon = require('sinon');
var utils = require('../lib/utils.js');
var ytdlUtils = require('../lib/ytdl-utils.js');
var ytdl = require('youtube-dl-exec')
var streamify = require('streamify');
var fs = require('fs');

describe('ytdl-utils.js - getVideoInfo(<url>) unit tests', function() {

  it('getVideoInfo(<url>) should return information result within a promise if extractor is youtube', function(done) {
    var url = 'https://www.youtube.com/watch?v=kZPtOf6gs5g';

    var info = {
      id: 'kZPtOf6gs5g',
      webpage_url: url,
      title: 'Title',
      duration: '1:05',
      extractor: 'youtube'
    };

    sinon.stub(ytdl, 'getInfo').yields(undefined, info);

    ytdlUtils.getVideoInfo(url).done(function(result) {
      expect(result.id).to.equal(info.id);
      expect(result.url).to.equal(info.webpage_url);
      expect(result.title).to.equal(info.title);
      expect(result.duration).to.equal(utils.formatDurationString(info.duration));

      ytdl.getInfo.restore()

      done();
    });
  });
  it('getVideoInfo(<url>) should return information result within a promise if extractor is vimeo', function(done) {
    var url = 'https://vimeo.com/6586873';

    var info = {
      id: '6586873',
      webpage_url: url,
      title: 'Title',
      duration: '1:05',
      extractor: 'vimeo'
    };

    sinon.stub(ytdl, 'getInfo').yields(undefined, info);

    ytdlUtils.getVideoInfo(url).done(function(result) {
      expect(result.id).to.equal(info.id);
      expect(result.url).to.equal(info.webpage_url);
      expect(result.title).to.equal(info.title);
      expect(result.duration).to.equal(utils.formatDurationString(info.duration));

      ytdl.getInfo.restore()

      done();
    });
  });
  it('getVideoInfo(<url>) should return information result within a promise if extractor is different from youtube or vimeo', function(done) {
    var url = 'https://vine.co/v/M0q6UEXFEH9';

    var info = {
      id: 'M0q6UEXFEH9',
      webpage_url: url,
      title: 'Title',
      extractor: 'Vine'
    };

    sinon.stub(ytdl, 'getInfo').yields(undefined, info);

    ytdlUtils.getVideoInfo(url).done(function(result) {
      expect(result.id).to.equal(info.id);
      expect(result.url).to.equal(info.webpage_url);
      expect(result.title).to.equal(info.title);
      expect(result.duration).to.equal(utils.formatDurationString(0));

      ytdl.getInfo.restore()

      done();
    });
  });
  it('getVideoInfo(<url>) should return a proper error result within a promise', function(done) {
    var url = 'https://www.youtube.com/watch?v=kZPtOf6gs5g';
    var err = 'Video not found!';

    sinon.stub(ytdl, 'getInfo').yields(err, undefined);

    ytdlUtils.getVideoInfo(url).catch(function(result) {
      expect(ytdl.getInfo.called).to.be.true;
      expect(result).to.equal(err);

      ytdl.getInfo.restore()

      done();
    }).done();
  })
});

describe('ytdl-utils.js - videoDownload(<file>, <format>, <url>) unit tests', function() {
  var file = utils.defaults.videoBowl + '/' + utils.getNanoTime() + '.mp4';
  var format = utils.defaults.videoFormat;
  var url = 'https://www.youtube.com/watch?v=kZPtOf6gs5g';
  var videoMock;

  beforeEach(function() {
    // Preparing a mock streamify object and put the two used methods as dummy.
    videoMock = sinon.mock(streamify);
    videoMock.on = function() {};
    videoMock.pipe = function() {};

    // Mock the ytdlWrapper method
    sinon.stub(ytdlUtils, 'ytdlWrapper', function() {
      return videoMock;
    }).withArgs(url, ['--format', format]);

    var stream = sinon.mock();
    sinon.stub(fs, 'createWriteStream', function() {
      return stream;
    });
    sinon.stub(videoMock, 'pipe', function() {
      return;
    }).withArgs(stream);
  });

  afterEach(function() {
    // Restore the methods.
    ytdlUtils.ytdlWrapper.restore()
    videoMock.on.restore();
    fs.createWriteStream.restore();
    videoMock.pipe.restore();
  });

  it('videoDownload(<file>, <format>, <url>) should return information result within a promise', function(done) {

    // Mock the dummy videoMock methods.
    var callbackVideoOn = sinon.stub(videoMock, 'on');
    callbackVideoOn.withArgs('error', sinon.match.func);
    callbackVideoOn.withArgs('end').yields();

    ytdlUtils.videoDownload(file, format, url).done(function(result) {
      expect(ytdlUtils.ytdlWrapper.calledOnce).to.be.true;
      expect(videoMock.on.calledTwice).to.be.true;
      expect(fs.createWriteStream.calledOnce).to.be.true;
      expect(videoMock.pipe.calledOnce).to.be.true;

      expect(result).to.equal(file);

      done();
    });
  });
  it('videoDownload(<file>, <format>, <url>) should return a proper error result within a promise', function(done) {
    var err = 'This video does not exist!';

    // Mock the dummy videoMock methods.
    var callbackVideoOn = sinon.stub(videoMock, 'on');
    callbackVideoOn.withArgs('error').yields(err);
    callbackVideoOn.withArgs('end', sinon.match.func);

    ytdlUtils.videoDownload(file, format, url).catch(function(result) {
      expect(ytdlUtils.ytdlWrapper.calledOnce).to.be.true;
      expect(videoMock.on.calledTwice).to.be.true;
      expect(fs.createWriteStream.calledOnce).to.be.true;
      expect(videoMock.pipe.calledOnce).to.be.true;

      expect(result).to.equal(err);

      done();
    }).done();
  });

});
