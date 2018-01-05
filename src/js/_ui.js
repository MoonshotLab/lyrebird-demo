const NProgress = require('nprogress');
const Promise = require('bluebird');
const download = require('downloadjs');

const screensaver = require('./_screensaver');
const video = require('./_video');
const audio = require('./_audio');

const $form = $('#form');
const $input = $('#input');
const $submitButton = $('#submit');
const $historySection = $('#recording-history');
const $historyList = $('#history-list');
const $status = $('#status');
const $volume = $('#vol');

const $cameraRoot = $('#camera-root');
let $cameraCanvas;

let screensaverTimeout = null;
let screensaverTimeoutLength = 30 * 1000; // ms

function playFromUrl(url) {
  const sound = new Audio(url);
  sound.play();
}

function setupSpacebarRecord() {
  $(window).on('keydown', function(e) {
    if (e.keyCode === 32) {
      // spacebar!
      audio.startListening();
    }
  });
}

function setupInputChange() {
  $input.on('keyup', function(e) {
    const $this = $(this);
    if ($this.val().length > 0) {
      $submitButton.prop('disabled', false);
    } else {
      $submitButton.prop('disabled', true);
    }
  });
}

function setupFormSubmit() {
  $form.on('submit', function(e) {
    e.preventDefault();
    const text = $input.val();

    if (!!text && text.length > 0) {
      audio
        .asyncGenerateAndPlayUtterance(text)
        .then(() => {
          $input.val('');
        })
        .catch(e => {
          console.log('error generating text', e);
        });
    } else {
      console.log('invalid text to generate');
    }
  });
}

// prevent screensaver on every user action
function setupActivityWake() {
  $(window).on('keydown mousemove mousedown', function(e) {
    keepAlive();
  });
}

// stave off screensaver
function keepAlive() {
  console.log('keepalive');
  if (screensaver.isActivated()) {
    wakeUp();
  }

  clearTimeout(screensaverTimeout);
  screensaverTimeout = setTimeout(goToSleep, screensaverTimeoutLength);
}

// start screensaver, reset everything
function goToSleep() {
  screensaver.start();
}

function wakeUp() {
  screensaver.stop();
}

let count = 0;
function takeScreenshot() {
  return new Promise((resolve, reject) => {
    try {
      const frame = captureVideoFrame('face_video', 'png');
      resolve(frame);
    } catch (e) {
      reject(e);
    }
  });
}

function startProgress() {
  NProgress.start();
  return;
}

function endProgress() {
  NProgress.done();
  return;
}

function setStatus(text) {
  $status.text(text);
}

function setVol(vol) {
  $volume.text(vol);
}

function hideVol() {
  $volume.parent().hide();
}

function showVol() {
  $volume.parent().show();
}

function asyncInit() {
  return new Promise((resolve, reject) => {
    try {
      setupInputChange();
      setupFormSubmit();
      setupActivityWake();
      video
        .asyncSetupCamera($cameraRoot)
        .then(video.startWatching)
        .then(keepAlive)
        .then(resolve);
    } catch (e) {
      reject(e);
    }
  });
}

exports.keepAlive = keepAlive;
exports.asyncInit = asyncInit;
exports.startProgress = startProgress;
exports.endProgress = endProgress;
exports.takeScreenshot = takeScreenshot;
exports.setupSpacebarRecord = setupSpacebarRecord;
exports.setStatus = setStatus;
exports.setVol = setVol;
exports.hideVol = hideVol;
exports.showVol = showVol;
