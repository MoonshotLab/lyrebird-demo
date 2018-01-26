const Promise = require('bluebird');

const ui = require('./_ui');

let detector;
let detectorRunning = false;
let frames = 0;

function hookUpDetectorEvents(detector) {
  detector.addEventListener('onInitializeFailure', e => {
    console.log('initialize failure');
    console.log(e);
  });

  /*
  onImageResults success is called when a frame is processed successfully and receives 3 parameters:
  - Faces: Dictionary of faces in the frame keyed by the face id.
           For each face id, the values of detected emotions, expressions, appearane metrics
           and coordinates of the feature points
  - image: An imageData object containing the pixel values for the processed frame.
  - timestamp: The timestamp of the captured image in seconds.
  */
  detector.addEventListener('onImageResultsSuccess', function(
    faces,
    image,
    timestamp
  ) {
    console.log('frame');
    if (frames % 5 === 0) {
      console.log('checking frame for face');
      if (faces.length > 0) {
        ui.keepAlive();
      } else {
        console.log('no faces');
      }
    }

    if (frames++ > 100) frames = 0;
  });

  /*
  onImageResults success receives 3 parameters:
  - image: An imageData object containing the pixel values for the processed frame.
  - timestamp: An imageData object contain the pixel values for the processed frame.
  - err_detail: A string contains the encountered exception.
  */
  detector.addEventListener('onImageResultsFailure', function(
    image,
    timestamp,
    err_detail
  ) {
    console.log('image result failure');
    console.log(image, timestamp, err_detail);
  });

  detector.addEventListener('onResetSuccess', e => {
    console.log('reset success');
    console.log(e);
  });

  detector.addEventListener('onResetFailure', e => {
    console.log('reset failure');
    console.log(e);
  });

  detector.addEventListener('onStopSuccess', e => {
    console.log('stop success');
    console.log(e);
  });

  detector.addEventListener('onStopFailure', e => {
    console.log('stop failure');
    console.log(e);
  });

  detector.addEventListener('onWebcamConnectSuccess', () => {
    console.log('connected to webcam');
  });

  detector.addEventListener('onWebcamConnectFailure', () => {
    const message =
      'Error connecting to webcam. Make sure it is plugged in and enabled.';
    ui.setMessageText(message);
    console.log(message);
  });
}

function startWatching() {
  if (detectorRunning !== true) {
    detectorRunning = true;
    detector.start();
  }
}

function stopWatching() {
  if (detectorRunning === true) {
    detectorRunning = false;
    detector.stop();
  }
}

function asyncSetupCamera($cameraRoot) {
  return new Promise((resolve, reject) => {
    try {
      const faceMode = affdex.FaceDetectorMode.LARGE_FACES;

      // check camera size with https://webrtchacks.github.io/WebRTC-Camera-Resolution/
      const [width, height] = [1920, 1080];
      detector = new affdex.CameraDetector(
        $cameraRoot[0],
        width,
        height,
        faceMode
      );

      hookUpDetectorEvents(detector);
      resolve();
    } catch (e) {
      console.log('error setting up camera', e);
      reject(e);
    }
  });
}

exports.asyncSetupCamera = asyncSetupCamera;
exports.startWatching = startWatching;
exports.stopWatching = stopWatching;
