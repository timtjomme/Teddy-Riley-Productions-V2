// ---- CONTENT PROTECTION -----------------------------------------------
// A deterrent, not real protection — view-source, devtools and a
// screenshot all still work regardless of any of this. It only removes
// the casual, one-click paths: right-click > Save/Copy, and dragging an
// image or the hero video out of the page. Form fields are exempted — a
// visitor needs their browser's normal right-click (paste, spell-check)
// to actually use the contact form.
document.addEventListener('contextmenu', function(e){
  var t = e.target;
  if(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
  e.preventDefault();
});
document.addEventListener('dragstart', function(e){
  if(e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') e.preventDefault();
});

// Named so cards created later (the 404's random pick) can reuse it.
function wireCard(card){
  function toggle(){
    var flipped = card.classList.toggle('flipped');
    card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
  }
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', function(e){
    // e.target guards against a nested control (the video button) bubbling
    // its own Enter/Space up here — only the card itself being the focused
    // target should flip it.
    if(e.target === card && (e.key === 'Enter' || e.key === ' ')){
      e.preventDefault();
      toggle();
    }
  });
}

document.querySelectorAll('.card-inner').forEach(wireCard);

// ---- NAV DROPDOWN ---------------------------------------------------
// The dropdown itself is a plain <details> — opening and closing it
// needs no JS. This only adds what <details> doesn't do on its own:
// closing when you click elsewhere or press Escape, so it doesn't sit
// open over the page after you've moved on.
document.addEventListener('click', function(e){
  document.querySelectorAll('.nav-dropdown[open]').forEach(function(d){
    if(!d.contains(e.target)) d.removeAttribute('open');
  });
});
document.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  document.querySelectorAll('.nav-dropdown[open]').forEach(function(d){
    d.removeAttribute('open');
  });
});

// LP or Single for a release straight out of releases.json — the decade pages
// get this stamped in by tools/build.py, but the 404 builds its card at runtime.
// Same rule as NUMBERED there: a numbered tracklist is an album. Keep in step.
var NUMBERED = /^\s*(?:\d{1,2}\s*[–—.)]|\d{2}\s)/;
function releaseFormat(r){
  if(r.format) return r.format;
  return r.tracks.some(function(t){ return NUMBERED.test(t); }) ? 'LP' : 'Single';
}

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
      '<img src="imgs/yep-avatar.png" alt="" height="128">' +
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

  // Every so often, pop the "YEP YEP!" bubble on its own — so a visitor who
  // never hovers or focuses the button still notices it's there. Skipped
  // under reduced motion; checks is-visible/is-open at fire time rather than
  // pausing and resuming the timer, so it stays in step with the widget's
  // own show/hide and the open panel without extra wiring.
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    setInterval(function(){
      if(!w.classList.contains('is-visible') || w.classList.contains('is-open')) return;
      w.classList.add('is-nudging');
      setTimeout(function(){ w.classList.remove('is-nudging'); }, 2400);
    }, 14000);
  }

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

// ---- VIDEO MODAL -------------------------------------------------------
// A release can carry one or more YouTube clips: a .video-btn's data-videos
// is a JSON array of {id, label}. Delegated at the document level so it
// also catches the 404 page's card, built after this runs.
function videoModal(){
  var modal, frame, tabs, lastFocus;

  function ensure(){
    if(modal) return;
    modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="video-modal-backdrop"></div>' +
      '<div class="video-modal-box" role="dialog" aria-modal="true" aria-label="Video">' +
        '<button type="button" class="video-modal-close" aria-label="Close">&times;</button>' +
        '<div class="video-modal-tabs"></div>' +
        '<div class="video-modal-frame">' +
          '<iframe src="" title="" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    frame = modal.querySelector('iframe');
    tabs  = modal.querySelector('.video-modal-tabs');
    modal.querySelector('.video-modal-backdrop').addEventListener('click', close);
    modal.querySelector('.video-modal-close').addEventListener('click', close);
  }

  function show(id){
    frame.title = 'YouTube video player';
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
  }

  function open(videos){
    ensure();
    lastFocus = document.activeElement;
    tabs.innerHTML = '';
    tabs.hidden = videos.length < 2;
    videos.forEach(function(v, i){
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = v.label;
      if(i === 0) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function(){
        show(v.id);
        Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(x){
          x.removeAttribute('aria-current');
        });
        b.setAttribute('aria-current', 'true');
      });
      tabs.appendChild(b);
    });
    show(videos[0].id);
    modal.hidden = false;
    requestAnimationFrame(function(){ modal.classList.add('is-open'); });
    modal.querySelector('.video-modal-close').focus();
  }

  function close(){
    if(!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    frame.src = '';                 // stop playback, not just hide it
    modal.hidden = true;
    if(lastFocus) lastFocus.focus();
  }

  // Capture phase, not bubble: .card-inner's own click-to-flip listener
  // sits between this button and document, so by the time a bubbling
  // listener up here saw the click, the flip had already fired. Capture
  // runs root-down, ahead of that listener, so stopPropagation here
  // actually pre-empts it instead of reacting a step too late.
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.video-btn');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    open(JSON.parse(btn.getAttribute('data-videos')));
  }, true);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') close();
  });
}

videoModal();

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
  // filter(Boolean): a directory-style miss (/1988-guy-groove-me/) ends in a
  // slash, so a plain pop() would hand back an empty string.
  var asked = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
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
      '<div class="card-inner" role="button" tabindex="0" aria-pressed="false" style="--cover-img:url(\'imgs/' + r.image + '\')">' +
        '<div class="face front">' +
          '<img src="imgs/' + r.image + '" alt="">' +
          '<span class="format"></span>' +
          '<div class="scrim"><p class="artist"></p><p class="title"></p></div>' +
        '</div>' +
        '<div class="face back">' +
          '<div class="back-head"><div class="back-head-text"><p class="artist"></p>' +
          '<p class="label-name"></p></div></div>' +
          '<ul class="tracks"></ul>' +
          '<div class="back-foot"><button type="button">Flip back</button></div>' +
        '</div>' +
      '</div>';
    // textContent throughout: release data must never be parsed as markup
    card.querySelector('.format').textContent = releaseFormat(r);
    card.querySelector('.front .artist').textContent = r.artist;
    card.querySelector('.front .title').textContent  = r.title;
    card.querySelector('.back .artist').textContent  = r.artist + ' — ' + r.title;
    card.querySelector('.label-name').textContent    = r.label;
    card.querySelector('img').alt = r.artist + ' – ' + r.title + ' sleeve';
    if(r.videos && r.videos.length){
      var videoBtn = document.createElement('button');
      videoBtn.type = 'button';
      videoBtn.className = 'video-btn';
      videoBtn.setAttribute('aria-label', 'Watch video');
      videoBtn.setAttribute('data-videos', JSON.stringify(r.videos));
      videoBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      card.querySelector('.back-head').appendChild(videoBtn);
    }
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

// ---- UPDATE BANNER -----------------------------------------------------
// Content and the data-update marker are baked in by tools/build.py; this
// only wires the dismiss button and remembers it in localStorage, keyed to
// the update's own date — a later entry in data/updates.json carries a new
// date, so it reappears even if an older one was dismissed. Runs last so a
// thrown localStorage access (old Safari private browsing) can't stop
// anything earlier in the file from wiring up.
function initUpdateBanner(){
  var banner = document.querySelector('.update-banner');
  if(!banner) return;
  var KEY = 'trp-dismissed-update';
  var id = banner.getAttribute('data-update');
  if(localStorage.getItem(KEY) === id){
    banner.remove();
    return;
  }
  banner.querySelector('.dismiss').addEventListener('click', function(){
    localStorage.setItem(KEY, id);
    banner.remove();
  });
}
initUpdateBanner();

// ---- TIMELINE SNAKE LINES -----------------------------------------------
// The connector on the biography timeline (timeline.html) isn't a fixed
// image or a hand-authored path — it's measured from the real, rendered
// centre of each .node-dot and redrawn whenever that can move: on load,
// on resize, and when a node opens and pushes the rows below it down.
// Column count is entirely .snake's own call in CSS; this just finds
// wherever the dots actually landed and connects them in order.
function debounce(fn, ms){
  var t;
  return function(){
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

function initSnakeLines(){
  var snakes = document.querySelectorAll('.snake');
  if(!snakes.length) return;

  // Straight segments with the sharp corners rounded off: pull back `r`
  // along each side of a corner and swap the corner itself for a
  // quadratic curve through it. A segment shorter than 2r just gets all
  // the room it has, so tight turns still round rather than overshoot.
  function roundedPath(points, r){
    if(points.length < 2) return '';
    var d = 'M' + points[0].x.toFixed(1) + ',' + points[0].y.toFixed(1);
    for(var i = 1; i < points.length - 1; i++){
      var p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
      var v1x = p1.x - p0.x, v1y = p1.y - p0.y, len1 = Math.hypot(v1x, v1y) || 1;
      var v2x = p2.x - p1.x, v2y = p2.y - p1.y, len2 = Math.hypot(v2x, v2y) || 1;
      var rr = Math.min(r, len1 / 2, len2 / 2);
      var ax = p1.x - (v1x / len1) * rr, ay = p1.y - (v1y / len1) * rr;
      var bx = p1.x + (v2x / len2) * rr, by = p1.y + (v2y / len2) * rr;
      d += ' L' + ax.toFixed(1) + ',' + ay.toFixed(1);
      d += ' Q' + p1.x.toFixed(1) + ',' + p1.y.toFixed(1) + ' ' + bx.toFixed(1) + ',' + by.toFixed(1);
    }
    var last = points[points.length - 1];
    d += ' L' + last.x.toFixed(1) + ',' + last.y.toFixed(1);
    return d;
  }

  snakes.forEach(function(snake){
    var svg = snake.querySelector('.snake-line');
    var path = svg && svg.querySelector('path');
    var nodes = Array.prototype.slice.call(snake.querySelectorAll('.node'));
    if(!svg || !path || nodes.length < 2) return;

    function draw(){
      // hidden below the grid breakpoint (one column, nothing to snake
      // through yet) — skip the measuring work, not just the drawing
      if(getComputedStyle(svg).display === 'none') return;

      var box = snake.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);

      // group nodes into visual rows by comparing each one's top edge —
      // simpler and more robust than trusting a hardcoded column count
      var rows = [];
      nodes.forEach(function(n){
        var r = n.getBoundingClientRect();
        var row = rows[rows.length - 1];
        if(row && Math.abs(r.top - row.top) < 4){
          row.nodes.push(n);
          row.bottom = Math.max(row.bottom, r.bottom);
        } else {
          rows.push({ top: r.top, bottom: r.bottom, nodes: [n] });
        }
      });

      var pts = [];
      rows.forEach(function(row, ri){
        row.nodes.forEach(function(n){
          var d = n.querySelector('.node-dot').getBoundingClientRect();
          pts.push({ x: d.left + d.width / 2 - box.left, y: d.top + d.height / 2 - box.top });
        });
        var next = rows[ri + 1];
        if(next){
          // The turn: past the end of the row first, THEN down — never
          // straight down from the last dot itself, because that column
          // keeps going for another 100-odd px of this same node's own
          // year and title underneath it. Sideways at the dot's own
          // height is safe regardless (text starts below the dot, not
          // beside it), and grid auto-flow guarantees a row only gets a
          // "next" row when it's full — a partial row is always the last
          // one — so the departing dot is always in the final column and
          // "just past the grid's right edge" is always clear of every
          // column's text, not just this row's.
          var last = pts[pts.length - 1];
          var channelX = box.width + 16;
          var midY = (row.bottom + next.top) / 2 - box.top;
          var nd = next.nodes[0].querySelector('.node-dot').getBoundingClientRect();
          var nextX = nd.left + nd.width / 2 - box.left;
          pts.push({ x: channelX, y: last.y });
          pts.push({ x: channelX, y: midY });
          pts.push({ x: nextX, y: midY });
        }
      });

      path.setAttribute('d', roundedPath(pts, 24));
    }

    draw();
    // a node opening pushes every row below it down, which is exactly
    // the kind of position change this needs to follow
    snake.addEventListener('toggle', function(){ requestAnimationFrame(draw); }, true);
    window.addEventListener('resize', debounce(draw, 150));
  });
}
initSnakeLines();
