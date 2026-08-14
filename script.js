// Named so cards created later (the 404's random pick) can reuse it.
function wireCard(card){
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
}

document.querySelectorAll('.card-inner').forEach(wireCard);

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
      '<p class="yep-sub">Have more info in a release; see something missing; ' +
        'saw a fault; or just want to connect? Hit my inbox!</p>' +
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

// ---- BACK TO TOP ------------------------------------------------------------
// One control, injected once, rather than markup repeated across five pages.
// Threshold-based: a page short enough to never cross it just never shows it.
function initToTop(){
  var a = document.createElement('a');
  a.href = '#';
  a.className = 'to-top';
  a.setAttribute('aria-label', 'Back to top');
  a.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(a);

  a.addEventListener('click', function(e){
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto' : 'smooth'
    });
  });

  var onScroll = function(){
    a.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

initToTop();
document.querySelectorAll('.contact-form').forEach(function(f){
  if(!f.closest('.ask') && !f.closest('.yep')) wireContactForm(f);
});

// contact.html ships a real form in its markup, and the 404 already offers
// plenty of ways out — the widget would just sit on its call to action
if(!document.querySelector('.contact-form:not(.ask .contact-form):not(.yep-form)') &&
   !document.querySelector('.lost')){
  buildYepWidget();
}

// ---- 404 -------------------------------------------------------------------
// Reads data/releases.json so the page knows which years actually exist, can
// point a mistyped year at the right anchor, and can offer a real release.
function initLostPage(){
  if(!document.querySelector('.lost')) return;

  var pathEl   = document.querySelector('[data-lost-path]');
  var hintEl   = document.querySelector('[data-lost-hint]');
  var realWrap = document.querySelector('[data-lost-real]');
  var realSub  = document.querySelector('[data-lost-real-sub]');
  var realGrid = document.querySelector('[data-lost-real-grid]');
  var calm     = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- 1. name what they actually asked for -------------------------------
  var asked = decodeURIComponent(location.pathname.split('/').pop() || '');
  if(asked && asked !== '404.html'){
    pathEl.innerHTML = 'No pressing of <span class="lost-slug"></span> exists.';
    pathEl.querySelector('.lost-slug').textContent = asked;
  }

  // --- 2. dig through the crates, then reveal ------------------------------
  var LABELS = ["Lil' Man Records", "Funky Mamma", "G.R. Productions",
                "New Jack Swing", "Future Records", "LOR Records",
                "Sound Of New York", "Rooftop Records", "QDT"];

  var dig     = document.querySelector('[data-lost-dig]');
  var digName = document.querySelector('[data-lost-dig-name]');
  var reveal  = document.querySelector('[data-lost-reveal]');

  function showReveal(){
    if(dig) dig.hidden = true;
    if(reveal){
      reveal.hidden = false;
      requestAnimationFrame(function(){ reveal.classList.add('is-in'); });
    }
  }

  if(calm || !dig || !digName || !reveal){
    showReveal();                       // no animation: go straight to the answer
  } else {
    var i = 0;
    (function nextLabel(){
      if(i < LABELS.length){
        digName.textContent = LABELS[i];
        digName.classList.remove('is-flip');
        void digName.offsetWidth;       // restart the flip animation
        digName.classList.add('is-flip');
        i++;
        setTimeout(nextLabel, 400);
      } else {
        digName.textContent = 'Nothing.';
        setTimeout(showReveal, 700);
      }
    })();
  }

  // --- 3. the data knows which years exist --------------------------------
  fetch('data/releases.json').then(function(r){ return r.json(); }).then(function(data){
    var all = [];
    Object.keys(data).forEach(function(page){
      data[page].forEach(function(rel){ all.push({ page: page, rel: rel }); });
    });
    if(!all.length) return;

    // a year in the URL they typed -> jump straight to that section
    var m = asked.match(/(19|20)\d{2}/);
    if(m){
      var year = m[0];
      var hit = all.filter(function(x){ return x.rel.year === year; });
      if(hit.length){
        hintEl.innerHTML = '';
        var a = document.createElement('a');
        a.href = hit[0].page + '.html#y' + year;
        a.textContent = 'Looking for ' + year + '? ' + hit.length +
                        (hit.length === 1 ? ' release' : ' releases') + ' →';
        hintEl.appendChild(a);
        hintEl.hidden = false;
      }
    }

    // --- 4. hand them something that does exist ---------------------------
    var pick = all[Math.floor(Math.random() * all.length)];
    var r = pick.rel;
    realSub.textContent = 'This one is real. Pulled at random from ' +
                          all.length + ' releases in the archive.';
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="card-inner" role="button" tabindex="0" aria-pressed="false">' +
        '<div class="face front">' +
          '<img src="imgs/' + r.image + '" alt="">' +
          '<span class="tag">' + r.year + '</span>' +
          '<div class="scrim"><p class="artist"></p><p class="title"></p></div>' +
        '</div>' +
        '<div class="face back">' +
          '<div class="back-head"><p class="artist"></p>' +
          '<p class="label-name"></p></div>' +
          '<ul class="tracks"></ul>' +
          '<div class="back-foot"><button type="button">Flip back</button></div>' +
        '</div>' +
      '</div>';
    // textContent throughout: release data must never be parsed as markup
    card.querySelector('.front .artist').textContent = r.artist;
    card.querySelector('.front .title').textContent  = r.title;
    card.querySelector('.back .artist').textContent  = r.artist + ' — ' + r.title;
    card.querySelector('.label-name').textContent    = r.label;
    card.querySelector('img').alt = r.artist + ' – ' + r.title + ' sleeve';
    var ul = card.querySelector('.tracks');
    var missing = r.missing || [];
    r.tracks.forEach(function(t){
      var li = document.createElement('li');
      li.textContent = t;
      if(missing.indexOf(t) !== -1) li.className = 'missing';
      ul.appendChild(li);
    });
    if(missing.length){
      var legend = document.createElement('span');
      legend.className = 'legend';
      legend.innerHTML = '<span></span>missing from collection';
      card.querySelector('.back-foot').insertBefore(
        legend, card.querySelector('.back-foot button'));
    }
    realGrid.appendChild(card);
    realWrap.hidden = false;
    wireCard(card.querySelector('.card-inner'));

    var link = document.createElement('a');
    link.className = 'lost-real-link';
    link.href = pick.page + '.html#y' + r.year;
    link.textContent = 'See all of ' + r.year + ' →';
    realWrap.appendChild(link);
  }).catch(function(){ /* no data, no bonus card — the page still works */ });
}

initLostPage();
