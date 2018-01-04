const Promise = require('bluebird');
const NProgress = require('nprogress');

const ui = require('./_ui');

let recordingInterval = null; // reference to setInterval

let audioContext = null;
let meter = null;
let mediaRecorder = null;

let keepRecording = false;
let recording = false;
let silenceDuration = 0; // ms

const volThreshold = 15; // softer than this will be considered silence

const detectAudioInterval = 500; // ms
const waitAfterVolumeLength = 0.5 * 1000; // ms
const ambientListeningWindowLength = 15 * 1000; // ms

function asyncPlayFromUrl(url) {
  return new Promise((resolve, reject) => {
    const sound = new Audio(url);
    sound.play();

    sound.addEventListener('ended', () => {
      resolve();
    });
  });
}

function startListening() {
  console.log('start listening');
  recordingInterval = setInterval(detectAudio, detectAudioInterval);
}

function stopListening() {
  console.log('stop listening');
  clearInterval(recordingInterval);
  recordingInterval = null;
}

function startMediaRecorder() {
  console.log('starting recording');
  mediaRecorder.start();
  recording = true;
  silenceDuration = 0;
}

function stopMediaRecorder() {
  console.log('stopping recording');
  mediaRecorder.stop();
  recording = false;
  silenceDuration = 0;
}

// called each interval via setInterval
function detectAudio() {
  const vol = Math.round(meter.volume * 100);
  console.log('vol', vol);

  if (recording) {
    if (vol > volThreshold) {
      // don't stop
      keepRecording = true;
      silenceDuration = 0;
    } else {
      // if we think we have audio content, stop recording within wait period. otherwise, record for longer
      const waitDuration = keepRecording
        ? waitAfterVolumeLength
        : ambientListeningWindowLength;

      if (silenceDuration > waitDuration) {
        // we haven't heard anything in a while, stop recording
        stopMediaRecorder();
      } else {
        // we haven't passed the silence threshold, wait
        silenceDuration += detectAudioInterval;
      }
    }
  } else {
    try {
      startMediaRecorder();
    } catch (e) {
      console.log(e);
    }

    if (vol > volThreshold) {
      keepRecording = true;
      silenceDuration = 0;
    }
  }
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

function asyncGenerateAndPlayUtterance(text) {
  return new Promise((resolve, reject) => {
    NProgress.start();

    ui
      .takeScreenshot()
      .then(frame => {
        return makeGenerateCall(text, frame);
      })
      .then(res => {
        NProgress.done();

        console.log('generate res', res);

        return asyncPlayFromUrl(res.audio_file)
          .then(() => {
            resolve();
          })
          .catch(e => {
            reject(e);
          });
      })
      .catch(e => {
        NProgress.done();
        reject(e);
      });
  });
}

function processAudioBlob(blob) {
  stopListening();
  const formData = new FormData();
  formData.append('data', blob);

  ui.startProgress();
  $.ajax({
    type: 'POST',
    url: '/process',
    data: formData,
    processData: false,
    contentType: false
  })
    .then(res => {
      console.log('transcription res', res);
      const transcription = res.transcription;
      return asyncGenerateAndPlayUtterance(transcription);
    })
    .then(() => {
      ui.endProgress();
      startListening();
    })
    .catch(e => {
      console.log('post error', e);
      ui.endProgress();
      // ui.setUserText('Error processing audio.');
      // handleAudioProcessingError(e);
      alert('could not transcribe, unable to submit to lyrebird');
      startListening();
    });
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
  const processor = audioContext.createScriptProcessor(512);
  processor.onaudioprocess = volumeAudioProcess;
  processor.clipping = false;
  processor.lastClip = 0;
  processor.volume = 0;
  processor.clipLevel = clipLevel || 0.98;
  processor.averaging = averaging || 0.95;
  processor.clipLag = clipLag || 750;

  // this will have no effect, since we don't copy the input to the output,
  // but works around a current Chrome bug.
  processor.connect(audioContext.destination);

  processor.checkClipping = function() {
    if (!this.clipping) return false;
    if (this.lastClip + this.clipLag < window.performance.now())
      this.clipping = false;
    return this.clipping;
  };

  processor.shutdown = function() {
    this.disconnect();
    this.onaudioprocess = null;
  };

  return processor;
}

function volumeAudioProcess(event) {
  const buf = event.inputBuffer.getChannelData(0);
  const bufLength = buf.length;
  let sum = 0;
  let x;

  // Do a root-mean-square on the samples: sum up the squares...
  for (let i = 0; i < bufLength; i++) {
    x = buf[i];
    if (Math.abs(x) >= this.clipLevel) {
      this.clipping = true;
      this.lastClip = window.performance.now();
    }
    sum += x * x;
  }

  // ... then take the square root of the sum.
  const rms = Math.sqrt(sum / bufLength);

  // Now smooth this out with the averaging factor applied
  // to the previous sample - take the max here because we
  // want "fast attack, slow release."
  this.volume = Math.max(rms, this.volume * this.averaging);
}

function setupMediaSource(stream) {
  // Create an AudioNode from the stream for getting vol
  const mediaStreamSource = audioContext.createMediaStreamSource(stream);

  // Create a new volume meter and connect it.
  meter = createAudioMeter(audioContext);
  mediaStreamSource.connect(meter);

  // Create a MediaRecorder
  mediaRecorder = new MediaRecorder(stream);
  let recordedChunks = [];

  mediaRecorder.ondataavailable = e => {
    recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = e => {
    let blob = new Blob(recordedChunks, { type: 'audio/webm;codecs=opus' });
    recordedChunks = [];

    if (keepRecording === true) {
      console.log('keeping nonsilent recording');
      processAudioBlob(blob);
    } else {
      console.log('discarding silent recording');
    }

    keepRecording = false;
    blob = null; // reset blob to make sure memory isn't leaking
  };
}

function asyncGetWebcamAudioInfo() {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      let defaultDevice = null;
      devices.map(device => {
        if (device.kind === 'audioinput') {
          if (device.label === 'HD Webcam C615') {
            resolve(device);
          } else if (device.deviceId === 'default') {
            defaultDevice = device;
          }
        }
      });
      resolve(defaultDevice); // if we can't find webcam, return default
    });
  });
}

function asyncSetupAudio() {
  return new Promise((resolve, reject) => {
    audioContext = new AudioContext();

    asyncGetWebcamAudioInfo()
      .then(deviceInfo => {
        console.log(deviceInfo);
        return navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: {
              exact: deviceInfo.deviceId
            }
            // mandatory: {
            //   googEchoCancellation: 'false',
            //   googAutoGainControl: 'false',
            //   googNoiseSuppression: 'false',
            //   googHighpassFilter: 'false'
            // }
          }
        });
      })
      .then(setupMediaSource)
      .then(resolve)
      .catch(e => {
        reject(e);
      });
  });
}

exports.asyncSetupAudio = asyncSetupAudio;
exports.asyncGenerateAndPlayUtterance = asyncGenerateAndPlayUtterance;
exports.asyncPlayFromUrl = asyncPlayFromUrl;
exports.startListening = startListening;
exports.stopListening = stopListening;