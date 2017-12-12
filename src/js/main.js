const ui = require('./_ui');
const video = require('./_video');

function run() {
  ui
    .asyncInit()
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
