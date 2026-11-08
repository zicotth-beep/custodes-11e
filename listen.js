/* Voice monitor (experimental): listens on desktop Chrome, matches spoken keywords
   against the datasheet/glossary index and opens the matching entry in the embedded app. */
(function () {
  'use strict';

  var D = window.DATA || {};
  var UNITS = Array.isArray(D.units) ? D.units : [];
  var DETS = Array.isArray(D.detachments) ? D.detachments : [];
  var GLOSS = D.gloss || {};
  var USR = Array.isArray(GLOSS.usrs) ? GLOSS.usrs : [];
  var CORE = Array.isArray(GLOSS.core) ? GLOSS.core : [];

  var $ = function (s) { return document.querySelector(s); };
  var heardEl = $('#heard'), hitsEl = $('#hits'), statusEl = $('#status'), dotEl = $('#dot');
  var frame = $('#frame'), startBtn = $('#startBtn'), stopBtn = $('#stopBtn');
  var langSel = $('#lang'), autoOpenEl = $('#autoOpen'), manualEl = $('#manual'), noteEl = $('#note');

  /* ---------- keyword index ---------- */
  var index = [];
  var seen = {};

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[\s\u3000]/g, '')
      .replace(/[·・,，、.。:：;；'"“”‘’()（）\[\]【】\-–—_/\\!?！？|]/g, '');
  }

  function add(text, type, id, label, extra) {
    var key = norm(text);
    if (!key) return;
    var cjk = /[\u3400-\u9fff]/.test(key);
    if (cjk && key.length < 2) return;
    if (!cjk && key.length < 3) return;
    var uniq = type + ':' + id + ':' + key;
    if (seen[uniq]) return;
    seen[uniq] = 1;
    var loose = key.replace(/[0-9+＋]/g, '').replace(/[xy]$/, '');
    index.push({ key: key, loose: loose, disp: text, type: type, id: id, label: label || text, extra: extra || null });
  }

  function buildIndex() {
    UNITS.forEach(function (u, i) {
      add(u.zh, 'unit', i, u.zh, u);
      add(u.en, 'unit', i, u.zh, u);
      var w = u.weapons || {};
      (w.melee || []).concat(w.ranged || []).forEach(function (x) {
        add(x.zh, 'unit', i, u.zh, u);
        add(x.name, 'unit', i, u.zh, u);
      });
    });
    DETS.forEach(function (d, i) {
      add(d.zh, 'det', i, d.zh, d);
      add(d.en, 'det', i, d.zh, d);
    });
    USR.concat(CORE).forEach(function (g, i) {
      add(g.zh, 'gloss', i, g.zh, g);
      add(g.en, 'gloss', i, g.zh, g);
    });
    // longest keywords first so specific names win over generic ones
    index.sort(function (a, b) { return (b.loose || b.key).length - (a.loose || a.key).length; });
  }

  /* ---------- matching ---------- */
  var buffer = '';
  var cooldown = {};
  var lastHitKey = '';
  var lastHitAt = 0;

  function detect(text, manual) {
    var t = norm(text);
    if (!t) return null;
    buffer = (buffer + ' ' + t).slice(-160);
    var hay = norm(buffer);
    var hayLoose = hay.replace(/[0-9+＋]/g, '');
    var fresh = norm(text);
    var now = Date.now();
    for (var i = 0; i < index.length; i++) {
      var e = index[i];
      var matched = hay.indexOf(e.key) !== -1 ||
        (e.loose && e.loose.length >= 2 && hayLoose.indexOf(e.loose) !== -1) ||
        (fresh.length >= 2 && e.key.indexOf(fresh) === 0) ||
        (fresh.length >= 3 && e.loose && e.loose.indexOf(fresh.replace(/[0-9+＋]/g, '')) === 0);
      if (!matched) continue;
      var stamp = e.type + ':' + e.id;
      if (!manual && cooldown[stamp] && now - cooldown[stamp] < 6000) continue;
      var hitKey = stamp + ':' + e.key;
      if (!manual && hitKey === lastHitKey && now - lastHitAt < 3000) continue;
      cooldown[stamp] = now;
      lastHitKey = hitKey;
      lastHitAt = now;
      fire(e);
      return e;
    }
    return null;
  }

  function fire(e) {
    var title = e.label, sub = '', text = '', openHash = '';
    if (e.type === 'unit' && e.extra) {
      sub = e.extra.en || '';
      openHash = '#/unit/' + e.id;
    } else if (e.type === 'det' && e.extra) {
      sub = e.extra.en || '';
      openHash = '#/det/' + e.id;
    } else if (e.type === 'gloss' && e.extra) {
      sub = e.extra.en || '';
      text = e.extra.text_zh || e.extra.text_en || '（未收錄解釋）';
    }
    var typeLabel = e.type === 'unit' ? '數據卡' : (e.type === 'det' ? '分隊' : '術語');
    var card = document.createElement('div');
    card.className = 'hitcard';
    card.innerHTML =
      '<div class="nm">' + esc(title) + '</div>' +
      (sub ? '<div class="en">' + esc(sub) + '</div>' : '') +
      '<div class="kw">' + typeLabel + ' · 命中「' + esc(e.disp || e.key) + '」 · ' + new Date().toLocaleTimeString() + '</div>' +
      (text ? '<div class="tx">' + esc(text).slice(0, 600) + (text.length > 600 ? '…' : '') + '</div>' : '') +
      (openHash ? '<div class="acts"><button class="vm-btn" type="button" data-open="' + openHash + '">在右邊打開</button></div>' : '');
    hitsEl.insertBefore(card, hitsEl.firstChild);
    while (hitsEl.children.length > 6) hitsEl.removeChild(hitsEl.lastChild);
    if (autoOpenEl.checked && openHash) openInFrame(openHash);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function openInFrame(hash) {
    try {
      frame.contentWindow.location.hash = hash;
      return;
    } catch (e) { /* fall through */ }
    frame.src = './index.html' + hash;
  }

  hitsEl.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-open]');
    if (b) openInFrame(b.getAttribute('data-open'));
  });

  /* ---------- speech recognition ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, wantListen = false;

  function setStatus(text, mode) {
    statusEl.textContent = text;
    dotEl.className = 'dot' + (mode ? ' ' + mode : '');
  }

  function supported() { return !!SR; }

  function startListening() {
    if (!SR) {
      setStatus('此瀏覽器不支援語音辨識（請用桌面 Chrome / Edge）', 'warn');
      return;
    }
    wantListen = true;
    rec = new SR();
    rec.lang = langSel.value;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = function () {
      setStatus('監聽中 · ' + langSel.value, 'live');
      startBtn.disabled = true;
      stopBtn.disabled = false;
    };
    rec.onerror = function (ev) {
      var msg = ev.error === 'not-allowed' ? '麥克風被拒絕，請在網址欄的鎖頭圖示允許麥克風'
        : ev.error === 'no-speech' ? '未聽到聲音，繼續監聽…'
          : ('語音錯誤：' + ev.error);
      setStatus(msg, 'warn');
    };
    rec.onend = function () {
      if (wantListen) setTimeout(function () { try { rec.start(); } catch (e) { /* ignore */ } }, 400);
      else { setStatus('已停止'); startBtn.disabled = false; stopBtn.disabled = true; }
    };
    rec.onresult = function (ev) {
      var interim = '', finalText = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      var tail = (finalText || interim).trim();
      if (tail) {
        heardEl.innerHTML = esc(tail) + (interim ? ' <span class="interim">' + esc(interim) + '</span>' : '');
        detect(tail, false);
      }
    };
    try { rec.start(); } catch (e) { setStatus('啟動失敗：' + e.message, 'warn'); }
  }

  function stopListening() {
    wantListen = false;
    if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } }
    setStatus('已停止');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  startBtn.addEventListener('click', startListening);
  stopBtn.addEventListener('click', stopListening);

  manualEl.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    var v = manualEl.value.trim();
    if (!v) return;
    var hit = detect(v, true);
    if (!hit) {
      var warn = document.createElement('div');
      warn.className = 'hitcard';
      warn.innerHTML = '<div class="nm">未命中</div><div class="kw">「' + esc(v) + '」不在索引內</div>';
      hitsEl.insertBefore(warn, hitsEl.firstChild);
    }
    manualEl.value = '';
  });

  try {
    var savedLang = localStorage.getItem('vm.lang');
    if (savedLang) langSel.value = savedLang;
    var savedAuto = localStorage.getItem('vm.auto');
    if (savedAuto === '0') autoOpenEl.checked = false;
  } catch (e) { /* ignore */ }
  langSel.addEventListener('change', function () {
    try { localStorage.setItem('vm.lang', langSel.value); } catch (e) { /* ignore */ }
    if (wantListen) { stopListening(); startListening(); }
  });
  autoOpenEl.addEventListener('change', function () {
    try { localStorage.setItem('vm.auto', autoOpenEl.checked ? '1' : '0'); } catch (e) { /* ignore */ }
  });

  /* ---------- boot ---------- */
  buildIndex();
  if (!supported()) {
    setStatus('不支援語音辨識，可用下方手動輸入測試', 'warn');
    noteEl.textContent = '（建議桌面 Chrome／Edge）';
  } else {
    setStatus('就緒 · 按「開始監聽」', null);
    noteEl.textContent = '索引 ' + index.length + ' 個關鍵詞';
  }

  var q = new URLSearchParams(location.search).get('q');
  if (q) setTimeout(function () { detect(q, true); }, 500);
})();
