const NProgress = require('nprogress');

const $form = $('#form');
const $input = $('#input');
const $submitButton = $('#submit');
const $historySection = $('#recording-history');
const $historyList = $('#history-list');

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

function setupFormSubmit() {
  $form.on('submit', function(e) {
    e.preventDefault();
    const text = $input.val();

    if (!!text && text.length > 0) {
      NProgress.start();
      $.ajax({
        type: 'POST',
        url: '/generate',
        data: {
          text: $input.val()
        },
        timeout: 15 * 1000
      })
        .then(res => {
          NProgress.done();

          playFromUrl(res.audio_file);
          $input.val('');

          addUtteranceToHistory(res);
        })
        .catch(e => {
          NProgress.done();
          console.log('e', e);
        });
    }
  });
}

function run() {
  setupInputChange();
  setupFormSubmit();
}

$(window).on('load', function() {
  run();
});
