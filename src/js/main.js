const $form = $('#form');
const $input = $('#input');
const $submitButton = $('#submit');

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
      $.post('/generate', {
        text: $input.val()
      })
        .then(res => {
          console.log('playing', res);
          playFromUrl(res);
          $input.val('');
        })
        .catch(e => {
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
