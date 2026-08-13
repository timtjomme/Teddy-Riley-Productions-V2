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

var FORM_ENDPOINT = 'https://formspree.io/f/moeawjre';

// Wire a contact form to submit in place. Every form still works as a plain
// POST without JS; this only keeps the visitor on the page.
function wireContactForm(form){
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var unconfigured = form.getAttribute('action').indexOf('YOUR_FORM_ID') !== -1;

  function say(msg, kind){
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    // Don't let a placeholder endpoint swallow someone's message silently.
    if(unconfigured){
      say('This form isn’t connected yet — no endpoint has been set.', 'error');
      return;
    }
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
          var m = d && d.errors ? d.errors.map(function(x){ return x.message; }).join(', ') : '';
          say(m || 'Something went wrong. Please try again.', 'error');
        });
      }
    }).catch(function(){
      say('Could not send — check your connection and try again.', 'error');
    }).then(function(){
      button.disabled = false;
    });
  });
}

// The footer prompt. Without JS it stays a link to the contact page; here it
// becomes a panel that opens on hover, focus or tap.
function buildAskPanel(ask){
  var uid = 'ask-' + Math.random().toString(36).slice(2, 8);
  var panel = document.createElement('div');
  panel.className = 'ask-panel';
  panel.innerHTML =
    '<div class="ask-panel-inner">' +
      '<form class="contact-form" action="' + FORM_ENDPOINT + '" method="POST">' +
        '<div class="field"><label for="' + uid + '-e">Your email</label>' +
        '<input id="' + uid + '-e" name="email" type="email" required autocomplete="email"></div>' +
        '<div class="field"><label for="' + uid + '-r">Which release is this about? <span class="opt">optional</span></label>' +
        '<input id="' + uid + '-r" name="release" type="text" placeholder="e.g. Guy — Teddy’s Jam (1988, Uptown)"></div>' +
        '<div class="field"><label for="' + uid + '-m">Message</label>' +
        '<textarea id="' + uid + '-m" name="message" rows="4" required></textarea></div>' +
        '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="form-foot"><button type="submit">Send message</button>' +
        '<p class="form-status" role="status" aria-live="polite"></p></div>' +
      '</form>' +
    '</div>';
  ask.appendChild(panel);
  wireContactForm(panel.querySelector('.contact-form'));

  var line = ask.querySelector('.ask-line');
  line.setAttribute('role', 'button');
  line.setAttribute('aria-expanded', 'false');

  function open(){ ask.classList.add('is-open'); line.setAttribute('aria-expanded','true'); }
  function close(){ ask.classList.remove('is-open'); line.setAttribute('aria-expanded','false'); }

  // Tap or click opens it and pins it open, so a hover-out mid-typing
  // can't collapse the form.
  line.addEventListener('click', function(e){
    e.preventDefault();
    ask.classList.contains('is-open') ? close() : open();
  });
  // Any interaction inside pins it too.
  panel.addEventListener('focusin', open);
  panel.addEventListener('click', open);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
}

// The floating YEP YEP prompt. Injected rather than repeated in each page's
// markup, and skipped on the contact page, which is already the form.
function buildYepWidget(){
  var w = document.createElement('div');
  w.className = 'yep';
  w.innerHTML =
    '<div class="yep-bubble" aria-hidden="true">YEP YEP!</div>' +
    '<button class="yep-btn" type="button" aria-expanded="false" ' +
      'aria-controls="yep-panel">' +
      '<img src="imgs/yep-avatar.jpg" alt="" width="64" height="64">' +
      '<span class="sr-only">Add something to the archive</span>' +
    '</button>' +
    '<div class="yep-panel" id="yep-panel" role="dialog" aria-modal="false" ' +
      'aria-label="Add something to the archive" hidden>' +
      '<div class="yep-head">' +
        '<p class="yep-title">YEP YEP!</p>' +
        '<button class="yep-close" type="button" aria-label="Close">&times;</button>' +
      '</div>' +
      '<p class="yep-sub">Know a release or a credit this archive is missing? ' +
        'Send it over.</p>' +
      '<form class="contact-form yep-form" action="' + FORM_ENDPOINT + '" method="POST">' +
        '<div class="field"><label for="yep-name">Your name ' +
          '<span class="opt">optional</span></label>' +
          '<input id="yep-name" name="name" type="text" autocomplete="name"></div>' +
        '<div class="field"><label for="yep-email">Your email</label>' +
          '<input id="yep-email" name="email" type="email" required ' +
          'autocomplete="email"></div>' +
        '<div class="field"><label for="yep-msg">What should we add?</label>' +
          '<textarea id="yep-msg" name="message" rows="3" required></textarea></div>' +
        '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" ' +
          'aria-hidden="true">' +
        '<div class="form-foot"><button type="submit">Yep, send it</button>' +
        '<p class="form-status" role="status" aria-live="polite"></p></div>' +
      '</form>' +
    '</div>';
  document.body.appendChild(w);

  var btn   = w.querySelector('.yep-btn');
  var panel = w.querySelector('.yep-panel');
  var close = w.querySelector('.yep-close');
  wireContactForm(w.querySelector('.contact-form'));

  function open(){
    panel.hidden = false;
    w.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    w.querySelector('#yep-name').focus();   // land inside, not on the trigger
  }
  var headerOnScreen = true;   // kept current by the observer below

  function shut(returnFocus){
    panel.hidden = true;
    w.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if(returnFocus) btn.focus();            // don't strand keyboard users
    // the observer only fires on a crossing, so re-check here: closing while
    // the header is on screen should tuck the widget away again
    if(headerOnScreen) w.classList.remove('is-visible');
  }

  btn.addEventListener('click', function(){
    panel.hidden ? open() : shut(false);
  });
  close.addEventListener('click', function(){ shut(true); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !panel.hidden) shut(true);
  });

  // Stay out of the way until the header has scrolled past.
  var header = document.querySelector('.hero-video, .hero');
  if(!header || !('IntersectionObserver' in window)){
    w.classList.add('is-visible');           // no header to wait on
    return;
  }
  new IntersectionObserver(function(entries){
    // entries can coalesce; the last one is the current state
    headerOnScreen = entries[entries.length - 1].isIntersecting;
    // never yank it away mid-typing
    if(headerOnScreen && panel.hidden) w.classList.remove('is-visible');
    if(!headerOnScreen) w.classList.add('is-visible');
  }, { threshold: 0 }).observe(header);
}

document.querySelectorAll('.ask').forEach(buildAskPanel);
document.querySelectorAll('.contact-form').forEach(function(f){
  if(!f.closest('.ask') && !f.closest('.yep')) wireContactForm(f);
});

// contact.html ships a real form in its markup; everywhere else gets the widget
if(!document.querySelector('.contact-form:not(.ask .contact-form):not(.yep-form)')){
  buildYepWidget();
}
