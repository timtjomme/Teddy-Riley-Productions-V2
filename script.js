document.querySelectorAll('.card-inner').forEach(function(card){
    function toggle(){
      var flipped = card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    }
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        toggle();
      }
    });
  });

// Contact form. Works as a plain POST without JS; this just keeps the
// visitor on the page and reports what happened.
(function(){
  var form = document.querySelector('.contact-form');
  if(!form) return;

  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var unconfigured = form.getAttribute('action').indexOf('YOUR_FORM_ID') !== -1;

  function say(msg, kind){
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('submit', function(e){
    // Don't let a placeholder endpoint swallow someone's message silently.
    if(unconfigured){
      e.preventDefault();
      say('This form isn’t connected yet — no endpoint has been set.', 'error');
      return;
    }

    e.preventDefault();
    button.disabled = true;
    say('Sending…');

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function(res){
      if(res.ok){
        form.reset();
        say('Thanks — your message is on its way.', 'ok');
      } else {
        return res.json().then(function(d){
          var e = d && d.errors ? d.errors.map(function(x){ return x.message; }).join(', ') : '';
          say(e || 'Something went wrong. Please try again.', 'error');
        });
      }
    }).catch(function(){
      say('Could not send — check your connection and try again.', 'error');
    }).then(function(){
      button.disabled = false;
    });
  });
})();
