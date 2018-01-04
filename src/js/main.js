const ui = require('./_ui');
const video = require('./_video');
const audio = require('./_audio');

function run() {
  ui
    .asyncInit()
    .then(audio.asyncSetupAudio)
    .then(audio.startListening)
    .then(() => {
      console.log('done!');
    })
    .catch(e => {
      console.log('error initting', e);
    });
}

$(window).on('load', function() {
  run();
});
