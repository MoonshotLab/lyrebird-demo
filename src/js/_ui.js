const NProgress = require('nprogress');
const Promise = require('bluebird');
const download = require('downloadjs');

const screensaver = require('./_screensaver');
const video = require('./_video');

const $form = $('#form');
const $input = $('#input');
const $submitButton = $('#submit');
const $historySection = $('#recording-history');
const $historyList = $('#history-list');

const $cameraRoot = $('#camera-root');
let $cameraCanvas;

let screensaverTimeout = null;
let screensaverTimeoutLength = 30 * 1000; // ms

function addUtteranceToHistory(utterance) {
  $historySection.show();

  $historyList.prepend(
    `<li><a href="/recordings/${utterance.id}" target="_blank">"${
      utterance.text
    }"</a></li>`
  );
}

function playFromUrl(url) {
  const sound = new Audio(url);
  sound.play();
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

function makeGenerateCall(text, frame) {
  const formData = new FormData();
  formData.append('blob', frame.blob);
  formData.append('text', text);

  return $.ajax({
    type: 'POST',
    url: '/generate',
    data: formData,
    processData: false,
    contentType: false,
    timeout: 15 * 1000
  });
}

function setupFormSubmit() {
  $form.on('submit', function(e) {
    e.preventDefault();
    const text = $input.val();

    if (!!text && text.length > 0) {
      NProgress.start();

      takeScreenshot()
        .then(frame => {
          return makeGenerateCall(text, frame);
        })
        .then(res => {
          NProgress.done();

          playFromUrl(res.audio_file);
          $input.val('');

          addUtteranceToHistory(res);
        })
        .catch(e => {
          NProgress.done();
          console.log(e);
        });
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

export function asyncInit() {
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
