/* Adeptus Custodes 11e quick reference — front-end logic (vanilla JS, no dependencies).
   Language-aware rendering for three display modes: both (zh+en), zh only, en only.
   Data comes from ./data.js (window.DATA); nothing here mutates the data. */
(function () {
  'use strict';
  var APP_VERSION = '2026-11-09.1';
  /* ---------- small helpers (declared first: hoisted) ---------- */
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v) { return (v === null || v === undefined) ? '' : String(v); }
  function pick() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== undefined && v !== null && str(v) !== '') return str(v);
    }
    return '';
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(v) {
    return str(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function normKey(s) { return str(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function flat(v, depth) {
    depth = depth || 0;
    if (v === null || v === undefined || depth > 6) return '';
    if (Array.isArray(v)) return v.map(function (x) { return flat(x, depth + 1); }).join(' ');
    if (typeof v === 'object') {
      return Object.keys(v).map(function (k) { return flat(v[k], depth + 1); }).join(' ');
    }
    return String(v);
  }

  /* ---------- guarded storage ---------- */
  var MEM = {};
  function readStore(key, dflt) {
    try {
      var v = window.localStorage.getItem(key);
      return (v === null || v === undefined) ? dflt : v;
    } catch (e) {
      return Object.prototype.hasOwnProperty.call(MEM, key) ? MEM[key] : dflt;
    }
  }
  function writeStore(key, value) {
    MEM[key] = str(value);
    try { window.localStorage.setItem(key, str(value)); } catch (e) { /* storage denied: memory only */ }
  }

  /* ---------- data ---------- */
  var RAW = (window.DATA && typeof window.DATA === 'object') ? window.DATA : {};
  var ARMY = (RAW.army && typeof RAW.army === 'object') ? RAW.army : {};
  var DETS = arr(RAW.detachments);
  var UNITS = arr(RAW.units);
  var GLOSS = (RAW.gloss && typeof RAW.gloss === 'object') ? RAW.gloss : {};
  var META = (RAW.meta && typeof RAW.meta === 'object') ? RAW.meta : null;

  /* ---------- state ---------- */
  var S = { lang: 'both', fs: 17, q: '', unitFilter: 'all', detFilter: 'all', tab: 'army', sheet: null, cmp: [], table: false };
  (function initState() {
    var l = readStore('cu.lang', 'both');
    S.lang = (l === 'zh' || l === 'en' || l === 'both') ? l : 'both';
    var f = parseInt(readStore('cu.fs', '17'), 10);
    S.fs = isFinite(f) ? Math.min(26, Math.max(15, f)) : 17;
    S.table = readStore('cu.table', '0') === '1';
  })();

  /* ---------- i18n ---------- */
  var L = {
    search: ['搜尋單位、分隊、規則、技能…', 'Search units, detachments, rules…'],
    clear: ['清除搜尋', 'Clear search'],
    language: ['切換語言', 'Switch language'],
    smaller: ['縮小字體', 'Smaller text'],
    larger: ['放大字體', 'Larger text'],
    about: ['關於、來源與離線', 'About, sources and offline'],
    close: ['關閉', 'Close'],
    tabArmy: ['軍隊規則', 'Army Rules'],
    tabDets: ['分隊', 'Detachments'],
    tabUnits: ['數據卡', 'Datasheets'],
    tabGloss: ['速查', 'Glossary'],
    armyTitle: ['軍隊規則', 'Army Rules'],
    martialKatah: ['御林武藝', 'Martial Ka’tah'],
    favoured: ['專長武藝', 'Favoured Ka’tah'],
    otherRules: ['其他軍隊規則', 'Other Army Rules'],
    when: ['使用時機', 'WHEN'],
    target: ['使用對象', 'TARGET'],
    effect: ['效果', 'EFFECT'],
    restr: ['限制', 'RESTRICTIONS'],
    detsTitle: ['分隊', 'Detachments'],
    unitsTitle: ['數據卡', 'Datasheets'],
    glossTitle: ['速查', 'Glossary'],
    glossUsr: ['武器技能', 'Weapon Abilities'],
    glossCore: ['核心技能', 'Core Abilities'],
    glossKw: ['關鍵詞', 'Keywords'],
    detRule: ['分隊規則', 'Detachment Rule'],
    enhancements: ['強化升級', 'Enhancements'],
    stratagems: ['戰略技能', 'Stratagems'],
    filterAll: ['全部', 'All'],
    filterChar: ['人物', 'Characters'],
    filterBattle: ['戰線', 'Battleline'],
    filterInf: ['步兵', 'Infantry'],
    filterMount: ['騎乘', 'Mounted'],
    filterVeh: ['載具', 'Vehicles'],
    filterAir: ['飛行器', 'Aircraft'],
    filterSisters: ['寂靜修女', 'Sisters of Silence'],
    filterLegend: ['傳奇', 'Legends'],
    detFilterUnique: ['唯一：盾衛團', 'Unique: Shield Host'],
    detFilterDp3: ['3 DP', '3 DP'],
    detFilterDp1: ['1 DP', '1 DP'],
    base: ['底盤', 'Base'],
    legend: ['傳奇', 'Legends'],
    faction: ['陣營', 'Faction'],
    coreAbilities: ['核心技能', 'Core Abilities'],
    abilities: ['技能', 'Abilities'],
    abilitiesZh: ['技能（中文）', 'Abilities (Chinese)'],
    abilitiesEn: ['技能（英文）', 'Abilities (English)'],
    pairingNote: ['中英文技能條目數量不一致，暫分開列出以免錯誤對照。', 'Chinese and English ability entries are not aligned; listed separately to avoid mismatched pairing.'],
    composition: ['單位構成', 'Unit Composition'],
    wargear: ['裝備與選項', 'Wargear & Options'],
    leadership: ['領導力', 'Leadership'],
    keywords: ['關鍵詞', 'Keywords'],
    leader: ['可帶領', 'Leader'],
    armyRulesUnit: ['軍隊規則', 'Army Rules'],
    weaponsRanged: ['遠程武器', 'Ranged Weapons'],
    weaponsMelee: ['格鬥武器', 'Melee Weapons'],
    nameHdr: ['武器', 'Weapon'],
    rangeHdr: ['射程', 'Range'],
    points: ['分', 'pts'],
    unique: ['唯一：盾衛團', 'Unique: Shield Host'],
    dp: ['DP', 'DP'],
    source: ['資料來源', 'Source'],
    pdfPage: ['PDF 頁', 'PDF page'],
    corrections: ['勘誤與差異', 'Corrections & differences'],
    noEnglish: ['英文原文尚未收錄。', 'English text not recorded yet.'],
    noResults: ['找不到', 'No results for'],
    searchHint: ['試試單位名稱、關鍵詞、分隊或規則字句。', 'Try a unit name, keyword, detachment or rule wording.'],
    results: ['搜尋結果', 'Results'],
    typeUnit: ['數據卡', 'Datasheet'],
    typeDet: ['分隊', 'Detachment'],
    typeRule: ['軍隊規則', 'Army Rule'],
    typeKat: ['武藝', 'Ka’tah'],
    typeEnh: ['強化', 'Enhancement'],
    typeStrat: ['戰略', 'Stratagem'],
    typeGloss: ['術語', 'Glossary'],
    typeArmy: ['軍隊規則', 'Army Rules'],
    online: ['線上', 'Online'],
    offline: ['離線', 'Offline'],
    offlineBanner: ['離線模式：顯示已快取內容。', 'Offline: showing cached content.'],
    ready: ['已就緒', 'Ready'],
    notReady: ['準備中', 'Preparing'],
    infoTitle: ['關於與離線', 'About & Offline'],
    offlineStatus: ['離線狀態', 'Offline status'],
    statusLabel: ['狀態', 'Status'],
    swUnsupported: ['此瀏覽器不支援離線快取（Service Worker）。', 'This browser does not support offline caching (service workers).'],
    swError: ['離線快取註冊失敗：', 'Service worker registration error: '],
    cacheVersion: ['快取版本', 'Cache version'],
    connection: ['連線', 'Connection'],
    appVersion: ['版本', 'Version'],
    updateNow: ['檢查更新', 'Check for update'],
    reloadApp: ['重新載入', 'Reload'],
    installTitle: ['安裝到主畫面', 'Add to Home Screen'],
    installed: ['已安裝（獨立視窗開啟）', 'Already installed (standalone)'],
    installBtn: ['立即安裝', 'Install now'],
    installIos: ['在 iPhone／iPad 上用 Safari 開啟本頁。', 'Open this page in Safari on iPhone/iPad.'],
    installIos2: ['點一下「分享」按鈕。', 'Tap the Share button.'],
    installIos3: ['選擇「加入主畫面」，再按「加入」。', 'Choose “Add to Home Screen”, then tap Add.'],
    installOther: ['在瀏覽器選單中選擇「安裝應用程式」或「加到主畫面」。', 'Use the browser menu and choose “Install app” or “Add to Home screen”.'],
    dataTitle: ['資料與來源', 'Data & Sources'],
    checkedDate: ['校對日期', 'Checked'],
    limitations: ['已知限制', 'Known limitations'],
    sources: ['來源', 'Sources'],
    dataPending: ['來源、校對日期與勘誤資訊尚未提供。', 'Source, checked date and correction details have not been provided yet.'],
    diagnostics: ['診斷', 'Diagnostics'],
    runDiag: ['執行診斷', 'Run diagnostics'],
    diagHint: ['檢查已註冊的 JS、HTML、CSS 與 JSON。', 'Checks registered JS, HTML, CSS and JSON assets.'],
    disclaimer: ['非官方玩家速查表。規則內容以 Games Workshop 官方英文出版物為準；本頁僅供個人遊戲參考。', 'Unofficial player reference. Rules follow the official Games Workshop English publications; personal gaming use only.'],
    glossPending: ['目前僅收錄名稱，解釋文字待補。', 'Names only so far; definitions are pending.'],
    glossSource: ['原文連結', 'Source link'],
    unitCount: ['張', 'entries'],
    backToList: ['返回列表', 'Back to list'],
    summary: ['一眼摘要', 'At a glance'],
    segAttr: ['屬性', 'Stats'],
    segWeap: ['武器', 'Weapons'],
    segAbil: ['技能', 'Abilities'],
    segKw: ['關鍵詞', 'Keywords'],
    segSrc: ['原文', 'Source'],
    compare: ['比較', 'Compare'],
    compareAdd: ['加入比較', 'Add to compare'],
    compareFull: ['最多比較 4 張', 'Compare up to 4'],
    compareClear: ['清除', 'Clear'],
    compareView: ['查看比較', 'View compare'],
    compareEmpty: ['揀 2–4 張數據卡就可以並排比較。', 'Pick 2–4 datasheets to compare side by side.'],
    compareCol: ['項目', 'Field'],
    prevUnit: ['上一張', 'Previous'],
    nextUnit: ['下一張', 'Next'],
    abTap: ['點擊看解釋', 'Tap for meaning'],
    abMissing: ['速查未收錄這個技能的中文解釋。', 'No glossary entry recorded for this ability yet.'],
    abOpenGloss: ['去速查睇全部技能', 'Open the glossary'],
    clearAll: ['全部清除', 'Clear all'],
    shortMelee: ['近', 'M'],
    shortRanged: ['遠', 'R'],
    tableMode: ['戰桌模式', 'Table mode'],
    tableOn: ['戰桌模式：大字、螢幕常亮、長按關閉', 'Table mode: big text, screen stays on, long-press to close'],
    tableOff: ['已離開戰桌模式', 'Table mode off'],
    holdToClose: ['戰桌模式：請長按關閉', 'Table mode: long-press the close button'],
    holdHint: ['長按 × 關閉', 'long-press × to close'],
    wakeOn: ['螢幕保持開啟', 'Screen stays on'],
    wakeOff: ['此裝置不支援螢幕常亮', 'Screen wake lock not supported']
  };
  function bi(zh, en) {
    if (S.lang === 'en') return str(en) || str(zh);
    if (S.lang === 'zh') return str(zh) || str(en);
    var a = str(zh), b = str(en);
    if (!a) return b;
    if (!b) return a;
    return a + ' / ' + b;
  }
  function T(key) {
    var e = L[key];
    if (!e) return key;
    return bi(e[0], e[1]);
  }
  function one(zh, en) { return (S.lang === 'en') ? (str(en) || str(zh)) : (str(zh) || str(en)); }
  function ptsUnit() { return S.lang === 'en' ? 'pts' : '分'; }

  /* ---------- language-aware content helpers ---------- */
  function nameHTML(zh, en, cls) {
    zh = str(zh); en = str(en); cls = cls || 'name';
    if (S.lang === 'en') {
      return '<div class="' + cls + ' name-en">' + (en ? esc(en) : '<span class="missing">' + esc(T('noEnglish')) + '</span>') + '</div>';
    }
    if (S.lang === 'zh') {
      var z = '<div class="' + cls + ' name-zh">' + esc(zh || en) + '</div>';
      return (zh || !en) ? z : z + '<div class="name-en">' + esc(en) + '</div>';
    }
    return '<div class="' + cls + ' name-zh">' + esc(zh || en) + '</div>' + (en ? '<div class="name-en">' + esc(en) + '</div>' : '');
  }
  function contentHTML(zh, en) {
    zh = str(zh); en = str(en);
    if (S.lang === 'en') {
      if (en) return '<div class="c-en">' + esc(en) + '</div>';
      if (zh) return '<div class="missing">' + esc(T('noEnglish')) + '</div>';
      return '';
    }
    if (S.lang === 'zh') return (zh || en) ? '<div class="c-zh">' + esc(zh || en) + '</div>' : '';
    var h = '';
    if (zh) h += '<div class="c-zh">' + esc(zh) + '</div>';
    if (en) h += '<div class="c-en en-line">' + esc(en) + '</div>';
    return h;
  }
  function lineHTML(zh, en) {
    zh = str(zh); en = str(en);
    if (S.lang === 'en') return en ? esc(en) : (zh ? '<span class="missing">' + esc(T('noEnglish')) + '</span>' : '');
    if (S.lang === 'zh') return esc(zh || en);
    if (zh && en) return esc(zh) + ' <span class="en-line" style="display:inline">' + esc(en) + '</span>';
    return esc(zh || en);
  }
  function labelValue(label, zh, en) {
    var body = lineHTML(zh, en);
    if (!body) return '';
    return '<div class="row"><b>' + esc(label) + '</b> ' + body + '</div>';
  }

  /* ---------- unit normalisation (never mutates DATA) ---------- */
  var SISTERS_NAMES = ['aleya', 'anathema psykana rhino', 'knight-centura', 'prosecutor squad', 'vigilator squad', 'witchseeker squad'];
  function isSisters(u) {
    var kw = arr(u.keywords).join(' ').toUpperCase();
    var kwz = arr(u.kw_zh).join(' ');
    var fac = (str(u.faction_en) + ' ' + str(u.faction_zh)).toUpperCase();
    if (/ANATHEMA PSYKANA|SISTERS OF SILENCE/.test(kw)) return true;
    if (/寂靜修女/.test(kwz) || /寂靜/.test(fac)) return true;
    if (/SILENCE/.test(fac)) return true;
    return SISTERS_NAMES.indexOf(str(u.en).toLowerCase()) >= 0;
  }
  function factionPair(u) {
    var zh = str(u.faction_zh), en = str(u.faction_en);
    if (zh || en) return { zh: zh, en: en };
    var sis = isSisters(u);
    return { zh: sis ? '帝皇禁軍／寂靜修女' : '帝皇禁軍', en: sis ? 'Adeptus Custodes — Anathema Psykana' : 'Adeptus Custodes' };
  }
  function abilityEntries(u) {
    var ab = arr(u.abilities);
    var abEn = arr(u.abilities_en);
    var inline = ab.length > 0 && ab.some(function (a) { return a && (a.n_en !== undefined || a.t_en !== undefined); });
    if (inline) {
      var list = ab.map(function (a) {
        return { n: str(a.n), t: str(a.t), n_en: str(a.n_en), t_en: str(a.t_en) };
      });
      abEn.forEach(function (e) {
        var matched = list.some(function (o) { return o.n_en && normKey(o.n_en) === normKey(e.n); });
        if (!matched) list.push({ n: '', t: '', n_en: str(e.n), t_en: str(e.t) });
      });
      return { paired: true, list: list };
    }
    if (ab.length === abEn.length) {
      return {
        paired: true,
        list: ab.map(function (a, i) {
          return { n: str(a.n), t: str(a.t), n_en: str(abEn[i].n), t_en: str(abEn[i].t) };
        })
      };
    }
    return { paired: false, zh: ab, en: abEn };
  }
  function enhanceList(d) {
    var base = arr(d.enh).length ? arr(d.enh) : arr(d.enhancements);
    var alt = arr(d.enh_en).length ? arr(d.enh_en) : arr(d.enhancements_en);
    var byName = {};
    alt.forEach(function (e) { var k = normKey(e.en || e.name || e.zh); if (k) byName[k] = e; });
    return base.map(function (e, i) {
      var other = byName[normKey(e.en || e.name || e.zh)] || alt[i] || {};
      return {
        zh: pick(e.zh, e.name_zh, other.zh, other.name_zh) || pick(e.en, e.name, other.en, other.name),
        en: pick(e.en, e.name_en, e.name, other.en, other.name_en, other.name),
        pts: pick(e.pts, e.points, other.pts, other.points),
        textZh: pick(e.text_zh, e.text, other.text_zh, other.text),
        textEn: pick(e.text_en, e.textEn, other.text_en, other.textEn)
      };
    });
  }
  function stratList(d) {
    var base = arr(d.strat).length ? arr(d.strat) : arr(d.stratagems);
    var alt = arr(d.strat_en).length ? arr(d.strat_en) : arr(d.stratagems_en);
    var byName = {};
    alt.forEach(function (s) { var k = normKey(s.en || s.name || s.zh); if (k) byName[k] = s; });
    return base.map(function (s, i) {
      var other = byName[normKey(s.en || s.name || s.zh)] || alt[i] || {};
      var en = pick(s.en, s.name_en, s.name, other.en, other.name_en, other.name);
      return {
        zh: pick(s.zh, s.name_zh, other.zh, other.name_zh) || en,
        en: en,
        cp: pick(s.cp, s.cp_cost, other.cp, other.cp_cost),
        whenZh: pick(s.when_zh, other.when_zh), whenEn: pick(s.when_en, other.when_en),
        targetZh: pick(s.target_zh, other.target_zh), targetEn: pick(s.target_en, other.target_en),
        effectZh: pick(s.effect_zh, other.effect_zh), effectEn: pick(s.effect_en, other.effect_en),
        restrZh: pick(s.restr_zh, s.restriction_zh, other.restr_zh, other.restriction_zh),
        restrEn: pick(s.restr_en, s.restriction_en, other.restr_en, other.restriction_en)
      };
    });
  }

  /* ---------- shared fragments ---------- */
  function statsRow(u) {
    var keys = ['M', 'T', 'SV', 'W', 'LD', 'OC', 'INV'];
    var st = u.stats || {};
    var h = '<div class="statline">';
    keys.forEach(function (k) {
      var v = k === 'INV' ? pick(st.INV, st.INSV, st.InSv) : st[k];
      if (v === undefined || v === null || v === '') v = '–';
      h += '<div><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span></div>';
    });
    return h + '</div>';
  }
  function costHTML(u) {
    var cost = arr(u.cost);
    if (!cost.length) return '';
    var pills = cost.map(function (c) {
      var labZh = pick(c.label_zh, c.label);
      var labEn = pick(c.label, c.label_en, c.label_zh);
      var itemsZh = arr(c.items).map(function (it) {
        return pick(it.models, '1') + ' 個模型 ' + pick(it.pts) + ' 分';
      }).join(' · ');
      var itemsEn = arr(c.items).map(function (it) {
        var m = pick(it.models, '1');
        return (m === '1' ? '1 model' : m + ' models') + ' ' + pick(it.pts) + ' pts';
      }).join(' · ');
      var text;
      if (S.lang === 'en') text = esc(labEn) + ': ' + esc(itemsEn);
      else if (S.lang === 'zh') text = esc(labZh) + '：' + esc(itemsZh);
      else text = esc(labZh) + '：' + esc(itemsZh) + ' <i class="pill-en">' + esc(labEn + ' ' + itemsEn) + '</i>';
      return '<span class="pill">' + text + '</span>';
    }).join('');
    return '<div class="pill-row">' + pills + '</div>';
  }
  function coreHTML(u) {
    var zh = str(u.core_zh), en = str(u.core);
    if (!zh && !en) return '';
    var primary = (S.lang === 'en') ? (en || zh) : (zh || en);
    var parts = primary.split(/[,、]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var h = '<div class="block"><h4>' + esc(T('coreAbilities')) + '</h4><div class="badges">';
    h += parts.map(function (p) { return '<span class="badge core">' + esc(p) + '</span>'; }).join('');
    h += '</div>';
    if (S.lang === 'both' && en && zh && en !== zh) h += '<div class="c-en en-line" style="margin-top:5px">' + esc(en) + '</div>';
    return h + '</div>';
  }
  function weaponsHTML(list, title, melee) {
    list = arr(list);
    if (!list.length) return '';
    var rows = list.map(function (w) {
      var primary, secondary = '';
      if (S.lang === 'en') {
        primary = pick(w.name, w.en, w.zh);
      } else {
        primary = pick(w.zh, w.name, w.en);
        if (S.lang === 'both' && w.name && w.zh && w.name !== w.zh) secondary = '<span class="en">' + esc(w.name) + '</span>';
      }
      var chips = abChips(w);
      return '<tr><td class="nm"><span class="zh">' + esc(primary) + '</span>' + secondary +
        (chips ? '<span class="ab">' + chips + '</span>' : '') + '</td>' +
        '<td>' + esc(pick(w.range, '–')) + '</td><td>' + esc(pick(w.A, '–')) + '</td><td>' + esc(melee ? pick(w.WS, w.BS, '–') : pick(w.BS, '–')) +
        '</td><td>' + esc(pick(w.S, '–')) + '</td><td>' + esc(pick(w.AP, '–')) + '</td><td>' + esc(pick(w.D, '–')) + '</td></tr>';
    }).join('');
    return '<table class="wtable"><caption>' + esc(title) + '</caption><thead><tr>' +
      '<th class="nm">' + esc(T('nameHdr')) + '</th><th>' + esc(T('rangeHdr')) + '</th><th>A</th><th>' + (melee ? 'WS' : 'BS') +
      '</th><th>S</th><th>AP</th><th>D</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function kwHTML(u) {
    var en = arr(u.keywords), zh = arr(u.kw_zh);
    var n = Math.max(en.length, zh.length);
    if (!n) return '';
    var chips = '';
    for (var i = 0; i < n; i++) {
      var e = str(en[i]), z = str(zh[i]);
      if (S.lang === 'en') chips += '<span class="badge kw">' + esc(e || z) + '</span>';
      else if (S.lang === 'zh') chips += '<span class="badge kw">' + esc(z || e) + '</span>';
      else chips += '<span class="badge kw">' + esc(z || e) + (e && z ? '<span class="kw-en">' + esc(e) + '</span>' : '') + '</span>';
    }
    return '<div class="block"><h4>' + esc(T('keywords')) + '</h4><div class="badges">' + chips + '</div></div>';
  }
  function noteList(items) {
    items = arr(items);
    if (!items.length) return '';
    return '<ul class="notes">' + items.map(function (it) {
      if (typeof it === 'string') return '<li>' + (S.lang === 'en' && /[\u3400-\u9fff]/.test(it) ? esc(T('noEnglish')) : esc(it)) + '</li>';
      var zh = pick(it.text_zh, it.zh, it.note_zh, it.note, it.description_zh, it.detail_zh, it.detail, it.text);
      var en = pick(it.text_en, it.en, it.note_en, it.description_en, it.detail_en, it.textEn);
      var label = pick(it.label, it.field, it.title, it.name, it.id, it.item);
      var url = pick(it.url, it.source_url, it.link, it.href);
      var body = lineHTML(zh, en);
      if (!body) body = '<span>' + esc(pick(it.before)) + '</span>' + (it.after ? ' → ' + esc(it.after) : '') + (it.support ? '<small> · ' + esc(it.support) + '</small>' : '');
      if (S.lang === 'en' && /[\u3400-\u9fff]/.test(label + body)) { label = ''; body = esc(T('noEnglish')); }
      return '<li>' + (label ? '<strong>' + esc(label) + '</strong> ' : '') + body +
        (url ? ' <a class="lnk" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">[' + esc(T('glossSource')) + ']</a>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- quick answers: summary, ability chips, compare, prev/next ---------- */
  function unitWeapons(u) {
    var w = (u && u.weapons) || {};
    return { ranged: arr(w.ranged), melee: arr(w.melee) };
  }
  function wnum(w, k) {
    var v = parseFloat(str(w && w[k]).replace(/[^0-9.\-]/g, ''));
    return isFinite(v) ? v : 0;
  }
  function wstat(w) {
    return 'A' + pick(w.A, '–') + ' · S' + pick(w.S, '–') + ' · AP' + pick(w.AP, '–') + ' · D' + pick(w.D, '–');
  }
  function topWeapon(list) {
    if (!arr(list).length) return null;
    return arr(list).slice().sort(function (a, b) {
      var av = wnum(a, 'A') * Math.max(1, wnum(a, 'S')) * (wnum(a, 'D') || 1);
      var bv = wnum(b, 'A') * Math.max(1, wnum(b, 'S')) * (wnum(b, 'D') || 1);
      return bv - av;
    })[0];
  }
  function abTokens(w) {
    function split(s) {
      return str(s).split(/[,、;；]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    var e = split(w.ab), z = split(w.ab_zh);
    if (e.length && z.length && e.length === z.length) {
      return e.map(function (x, i) { return { en: x, zh: z[i] }; });
    }
    if (e.length) return e.map(function (x) { return { en: x, zh: '' }; });
    return z.map(function (x) { return { en: '', zh: x }; });
  }
  function abChips(w) {
    return abTokens(w).map(function (t) {
      var lab = (S.lang === 'en') ? (t.en || t.zh) : (t.zh || t.en);
      return '<button type="button" class="abchip" data-ab="' + esc(t.en || t.zh) + '" data-abzh="' + esc(t.zh) +
        '" aria-label="' + esc(lab + ' — ' + T('abTap')) + '">' + esc(lab) + '</button>';
    }).join(' ');
  }
  var abIndex = null;
  function abKey(s) {
    var k = normKey(s).replace(/:.*$/, '');
    return k.replace(/\b(x|y)\b/g, '').replace(/[0-9]+/g, '').replace(/\s+/g, ' ').trim();
  }
  function findAb(term, zhTerm) {
    if (!abIndex) {
      abIndex = {};
      arr(GLOSS.usrs).concat(arr(GLOSS.core)).forEach(function (g) {
        var k = abKey(g.en || g.zh);
        if (k) abIndex[k] = g;
      });
    }
    var k = abKey(term);
    if (k && abIndex[k]) return abIndex[k];
    var keys = Object.keys(abIndex), best = null, i, g;
    if (k) {
      for (i = 0; i < keys.length; i++) {
        g = keys[i];
        if (k.indexOf(g) === 0 || g.indexOf(k) === 0) { if (!best || g.length > best.length) best = g; }
      }
      if (best) return abIndex[best];
    }
    var zk = abKey(zhTerm);
    if (zk) {
      var hit = null;
      arr(GLOSS.usrs).forEach(function (item) {
        if (!hit && abKey(item.zh) === zk) hit = item;
      });
      if (hit) return hit;
    }
    return null;
  }
  function summaryHTML(u) {
    var w = unitWeapons(u);
    var r = topWeapon(w.ranged), m = topWeapon(w.melee);
    if (!r && !m) return '';
    function row(label, wp) {
      if (!wp) return '';
      var nm = (S.lang === 'en') ? pick(wp.name, wp.zh) : pick(wp.zh, wp.name);
      var alt = (S.lang === 'both' && wp.name && wp.zh && wp.name !== wp.zh) ? ' <i class="en">' + esc(wp.name) + '</i>' : '';
      return '<div class="sumline"><span class="lab">' + esc(label) + '</span><span class="wnm">' + esc(nm) + alt +
        '</span><span class="wst">' + esc(wstat(wp)) + '</span></div>';
    }
    return '<div class="summary"><h4>' + esc(T('summary')) + '</h4>' +
      row(T('weaponsMelee'), m) + row(T('weaponsRanged'), r) + '</div>';
  }
  function segNavHTML(tabs) {
    if (!tabs.length) return '';
    return '<nav class="segnav" id="segnav" aria-label="' + esc(bi('頁內段落', 'Sections')) + '">' +
      tabs.map(function (t, i) {
        return '<button type="button" class="segbtn' + (i === 0 ? ' on' : '') + '" data-sec="' + esc(t[0]) + '">' + esc(t[1]) + '</button>';
      }).join('') + '</nav>';
  }
  function navBarHTML(kind, nav) {
    if (!nav || !arr(nav.order).length || nav.pos < 0) return '';
    var prev = nav.pos > 0 ? nav.order[nav.pos - 1] : null;
    var next = nav.pos < nav.order.length - 1 ? nav.order[nav.pos + 1] : null;
    return '<div class="snav">' +
      '<button type="button" class="snav-btn" data-nav="' + kind + ':' + (prev === null ? '-' : prev) + '"' + (prev === null ? ' disabled' : '') + '>‹ ' + esc(T('prevUnit')) + '</button>' +
      '<span class="snav-pos">' + (nav.pos + 1) + ' / ' + nav.order.length + '</span>' +
      '<button type="button" class="snav-btn" data-nav="' + kind + ':' + (next === null ? '-' : next) + '"' + (next === null ? ' disabled' : '') + '>' + esc(T('nextUnit')) + ' ›</button>' +
      '</div>';
  }
  function sourceBlock(o) {
    o = o || {};
    var url = pick(o.source_url, o.sourceUrl, o.url, o.source);
    var page = pick(o.pdf_page, o.pdfPage, o.page);
    var corr = arr(o.corrections);
    if (!url && !page && !corr.length) return '';
    var h = '<div class="src"><h4>' + esc(T('source')) + '</h4>';
    if (url) {
      var short = url.length > 64 ? url.slice(0, 61) + '…' : url;
      h += '<p class="src-line"><a class="lnk" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(short) + '</a>' +
        (page ? ' · ' + esc(T('pdfPage')) + ' ' + esc(page) : '') + '</p>';
    } else if (page) {
      h += '<p class="src-line">' + esc(T('pdfPage')) + ' ' + esc(page) + '</p>';
    }
    if (corr.length) h += '<details><summary class="src-sub">' + esc(T('corrections')) + ' (' + corr.length + ')</summary>' + noteList(corr) + '</details>';
    if (o.pdf_text_zh && S.lang !== 'en') h += '<details><summary class="src-sub">原 PDF 第 ' + esc(page) + ' 頁 · 繁體原文（未修改數值）</summary><pre class="original-text">' + esc(o.pdf_text_zh) + '</pre></details>';
    return h + '</div>';
  }

  /* ---------- unit detail ---------- */
  function unitHTML(u, nav) {
    var faction = factionPair(u);
    var h = '';
    var tabs = [['u-top', T('segAttr')]];
    h = '<div class="card lead" id="u-top">';
    h += nameHTML(u.zh, u.en, 'name');
    h += '<div class="badges">';
    h += '<span class="badge">' + esc(T('base')) + ' ' + esc(pick(u.base, '–')) + '</span>';
    h += '<span class="badge">' + esc(bi(faction.zh, faction.en)) + '</span>';
    if (u.legend) h += '<span class="badge legend">' + esc(T('legend')) + '</span>';
    h += '</div>';
    h += statsRow(u);
    h += costHTML(u);
    h += '</div>';
    h += summaryHTML(u);

    var sections = '';
    var compZh = pick(u.comp_zh, u.comp), compEn = pick(u.comp_en, u.composition_en);
    var wgEn = pick(u.wargear_en, u.wargearEn), wgZh = pick(u.wargear_zh, u.wargear);
    if (compZh || compEn || wgEn || wgZh) {
      var attr = '<div class="block"><h4>' + esc(T('composition')) + '</h4>';
      if (compZh || compEn) attr += contentHTML(compZh, compEn);
      if (wgZh || wgEn) {
        attr += '<h5>' + esc(T('wargear')) + '</h5>' + contentHTML(wgZh, wgEn);
      }
      attr += '</div>';
      sections += '<section class="usec" id="u-attr" data-sect="u-attr">' + attr + '</section>';
    }

    var wep = u.weapons || {};
    var wepHtml = weaponsHTML(wep.ranged, T('weaponsRanged'), false) + weaponsHTML(wep.melee, T('weaponsMelee'), true);
    if (wepHtml) {
      tabs.push(['u-weap', T('segWeap')]);
      sections += '<section class="usec" id="u-weap" data-sect="u-weap">' + wepHtml + '</section>';
    }

    var abil = coreHTML(u) + abilitiesHTML(u);
    if (u.leadership_en || u.leadership_zh) {
      abil += '<div class="block"><dl class="kv"><dt>' + esc(T('leadership')) + '</dt><dd>' +
        lineHTML(u.leadership_zh, u.leadership_en) + '</dd></dl></div>';
    }
    if (u.ledby) {
      var names = str(u.ledby).split(/[\s,、]+/).filter(Boolean);
      abil += '<div class="block"><h4>' + esc(T('leader')) + '</h4><div class="badges">' +
        names.map(function (n) { return '<span class="badge">' + esc(n) + '</span>'; }).join('') + '</div></div>';
    }
    if (u.army) {
      abil += '<div class="block"><h4>' + esc(T('armyRulesUnit')) + '</h4>' + contentHTML('', str(u.army)) + '</div>';
    }
    if (abil) {
      tabs.push(['u-abil', T('segAbil')]);
      sections += '<section class="usec" id="u-abil" data-sect="u-abil">' + abil + '</section>';
    }

    var kw = kwHTML(u);
    if (kw) {
      tabs.push(['u-kw', T('segKw')]);
      sections += '<section class="usec" id="u-kw" data-sect="u-kw">' + kw + '</section>';
    }

    var src = sourceBlock(u);
    if (src) {
      tabs.push(['u-src', T('segSrc')]);
      sections += '<section class="usec" id="u-src" data-sect="u-src">' + src + '</section>';
    }

    return h + segNavHTML(tabs) + sections + navBarHTML('unit', nav);
  }
  function abilitiesHTML(u) {
    var r = abilityEntries(u);
    var h = '';
    if (r.paired) {
      if (!r.list.length) return '';
      h += '<div class="block"><h4>' + esc(T('abilities')) + '</h4>';
      r.list.forEach(function (a) {
        h += '<div class="abil">' + nameHTML(a.n, a.n_en, 'n') + contentHTML(a.t, a.t_en) + '</div>';
      });
      return h + '</div>';
    }
    if (!r.zh.length && !r.en.length) return '';
    h += '<div class="block"><h4>' + esc(T('abilities')) + '</h4>';
    if (S.lang === 'both' && r.zh.length && r.en.length) {
      h += '<p class="missing">' + esc(T('pairingNote')) + '</p>';
    }
    if (S.lang !== 'en' && r.zh.length) {
      if (S.lang === 'both' && r.en.length) h += '<h5>' + esc(T('abilitiesZh')) + '</h5>';
      r.zh.forEach(function (a) {
        h += '<div class="abil"><div class="n name-zh">' + esc(a.n) + '</div>' + contentHTML(a.t, '') + '</div>';
      });
    }
    if (S.lang !== 'zh' && r.en.length) {
      if (S.lang === 'both' && r.zh.length) h += '<h5>' + esc(T('abilitiesEn')) + '</h5>';
      r.en.forEach(function (a) {
        h += '<div class="abil"><div class="n name-en">' + esc(a.n) + '</div>' + contentHTML('', a.t) + '</div>';
      });
    }
    return h + '</div>';
  }

  /* ---------- detachment detail ---------- */
  function detBadges(d) {
    var h = '';
    var dp = Number(d.dp);
    h += '<span class="badge dp' + (dp >= 3 ? '3' : '') + '">' + esc(pick(d.dp, '–')) + ' DP</span>';
    var disp = (S.lang === 'en') ? pick(d.disp_en, d.disp_zh) : pick(d.disp_zh, d.disp_en);
    if (disp) h += '<span class="badge">' + esc(disp) + '</span>';
    if (d.unique) h += '<span class="badge uniq">' + esc(T('unique')) + '</span>';
    return h;
  }
  function detHTML(d, nav) {
    var h = '';
    h += '<div class="card lead">' + nameHTML(d.zh, d.en, 'name') + '<div class="badges">' + detBadges(d) + '</div></div>';
    if (d.rule_zh || d.rule_en || d.rule_text_zh || d.rule_text_en) {
      h += '<div class="block"><h4>' + esc(T('detRule')) + '</h4>' +
        nameHTML(d.rule_zh, d.rule_en, 'card-title') +
        contentHTML(d.rule_text_zh, d.rule_text_en) + '</div>';
    }
    var enh = enhanceList(d);
    if (enh.length) {
      h += '<div class="block"><h4>' + esc(T('enhancements')) + ' <span class="count">' + enh.length + '</span></h4>';
      enh.forEach(function (e) {
        h += '<div class="abil"><div class="hd">' + nameHTML(e.zh, e.en, 'n') +
          (e.pts ? '<span class="badge pts">' + esc(e.pts) + ' ' + esc(ptsUnit()) + '</span>' : '') + '</div>' +
          contentHTML(e.textZh, e.textEn) + '</div>';
      });
      h += '</div>';
    }
    var st = stratList(d);
    if (st.length) {
      h += '<div class="block"><h4>' + esc(T('stratagems')) + ' <span class="count">' + st.length + '</span></h4>';
      st.forEach(function (s) {
        h += '<div class="strat"><div class="hd">' + nameHTML(s.zh, s.en, 'nm') +
          (s.cp ? '<span class="cp">' + esc(s.cp) + ' CP</span>' : '') + '</div>' +
          labelValue(T('when'), s.whenZh, s.whenEn) +
          labelValue(T('target'), s.targetZh, s.targetEn) +
          labelValue(T('effect'), s.effectZh, s.effectEn) +
          labelValue(T('restr'), s.restrZh, s.restrEn) + '</div>';
      });
      h += '</div>';
    }
    h += sourceBlock(d);
    return h + navBarHTML('det', nav);
  }

  /* ---------- list views ---------- */
  function sectionTitle(text, count) {
    return '<div class="section-title">' + esc(text) + (count !== undefined && count !== null ?
      ' <span class="count">(' + esc(count) + ')</span>' : '') + '</div>';
  }
  function armyView() {
    var h = '';
    h += sectionTitle(T('armyTitle'));
    var intro = ARMY.intro || {}, fav = ARMY.favoured || {};
    h += '<div class="card lead">' + nameHTML('御林武藝', 'Martial Ka’tah', 'card-title') +
      '<div class="block">' + contentHTML(intro.zh, intro.en) + '</div>' +
      (fav.zh || fav.en ? '<div class="block"><h5>' + esc(T('favoured')) + '</h5>' + contentHTML(fav.zh, fav.en) + '</div>' : '') +
      '</div>';
    arr(ARMY.ka_tahs).forEach(function (k) {
      h += '<div class="card">' + nameHTML(k.zh, k.en, 'card-title') +
        '<div class="block"><dl class="kv">' +
        '<dt>' + esc(T('when')) + '</dt><dd>' + lineHTML(k.when_zh, k.when_en) + '</dd>' +
        '<dt>' + esc(T('target')) + '</dt><dd>' + lineHTML(k.target_zh, k.target_en) + '</dd>' +
        '<dt>' + esc(T('effect')) + '</dt><dd>' + lineHTML(k.effect_zh, k.effect_en) + '</dd>' +
        '</dl></div></div>';
    });
    var rules = arr(ARMY.rules);
    if (rules.length) {
      h += sectionTitle(T('otherRules'), rules.length);
      rules.forEach(function (r) {
        h += '<div class="card">' + nameHTML(r.zh, r.en, 'card-title') +
          '<div class="block">' + contentHTML(r.text_zh, r.text_en) + '</div></div>';
      });
    }
    h += dataSummaryCard();
    return h;
  }
  function dataSummaryCard() {
    var h = '<div class="src"><h4>' + esc(T('dataTitle')) + '</h4>';
    h += dataSummaryBody();
    h += '<button class="actionbtn" type="button" data-info="1">' + esc(T('infoTitle')) + '</button>';
    return h + '</div>';
  }
  function detMatches(d) {
    var f = S.detFilter;
    if (f === 'all') return true;
    if (f === 'unique') return !!d.unique;
    if (f === 'dp3') return Number(d.dp) >= 3;
    if (f === 'dp1') return Number(d.dp) === 1;
    if (f.indexOf('disp:') === 0) return str(d.disp_en) === f.slice(5) || str(d.disp_zh) === f.slice(5);
    return true;
  }
  function detFilters() {
    var defs = [
      { k: 'all', zh: '全部', en: 'All' },
      { k: 'dp1', zh: '1 DP', en: '1 DP' },
      { k: 'dp3', zh: '3 DP', en: '3 DP' },
      { k: 'unique', zh: '唯一：盾衛團', en: 'Unique: Shield Host' }
    ];
    var seen = {};
    DETS.forEach(function (d) {
      var key = str(d.disp_en) || str(d.disp_zh);
      if (!key || seen[key]) return;
      seen[key] = true;
      defs.push({ k: 'disp:' + key, zh: str(d.disp_zh) || key, en: key });
    });
    return defs;
  }
  function detsView() {
    var defs = detFilters();
    var h = '<div class="filters">';
    defs.forEach(function (def) {
      var n = DETS.filter(function (d) {
        var keep = S.detFilter;
        S.detFilter = def.k;
        var ok = detMatches(d);
        S.detFilter = keep;
        return ok;
      }).length;
      h += '<button class="chip' + (S.detFilter === def.k ? ' on' : '') + '" type="button" data-detfilter="' + esc(def.k) + '">' +
        esc(bi(def.zh, def.en)) + ' <span class="n">' + n + '</span></button>';
    });
    h += '</div>';
    var list = detList();
    h += sectionTitle(T('detsTitle'), list.length);
    list.forEach(function (d) {
      var i = DETS.indexOf(d);
      var disp = (S.lang === 'en') ? pick(d.disp_en, d.disp_zh) : pick(d.disp_zh, d.disp_en);
      h += '<button class="card tap" type="button" data-det="' + i + '"><div class="card-head"><div>' +
        nameHTML(d.zh, d.en, 'card-title') +
        '<div class="card-sub">' + lineHTML(d.rule_zh, d.rule_en) + (disp ? ' · ' + esc(disp) : '') + '</div>' +
        '</div><span class="chev"><svg class="ico" aria-hidden="true"><use href="#i-chev"></use></svg></span></div>' +
        '<div class="badges">' + detBadges(d) +
        '<span class="badge">' + esc(T('enhancements')) + ' ' + enhanceList(d).length + ' · ' + esc(T('stratagems')) + ' ' + stratList(d).length + '</span>' +
        '</div></button>';
    });
    return h;
  }
  function detList() {
    return DETS.filter(detMatches);
  }
  function detOrder() {
    return detList().map(function (d) { return DETS.indexOf(d); });
  }
  var UNIT_CATS = [
    { k: 'all', label: 'filterAll', test: function () { return true; } },
    { k: 'char', label: 'filterChar', test: function (u) { return arr(u.keywords).indexOf('CHARACTER') >= 0; } },
    { k: 'battle', label: 'filterBattle', test: function (u) { return arr(u.keywords).indexOf('BATTLELINE') >= 0; } },
    { k: 'inf', label: 'filterInf', test: function (u) { return arr(u.keywords).indexOf('INFANTRY') >= 0; } },
    { k: 'mount', label: 'filterMount', test: function (u) { return arr(u.keywords).indexOf('MOUNTED') >= 0; } },
    {
      k: 'veh', label: 'filterVeh', test: function (u) {
        var kw = arr(u.keywords);
        return kw.indexOf('VEHICLE') >= 0 || kw.indexOf('WALKER') >= 0 || kw.indexOf('DREADNOUGHT') >= 0;
      }
    },
    { k: 'air', label: 'filterAir', test: function (u) { return arr(u.keywords).indexOf('AIRCRAFT') >= 0; } },
    { k: 'sisters', label: 'filterSisters', test: isSisters },
    { k: 'legend', label: 'filterLegend', test: function (u) { return !!u.legend; } }
  ];
  function unitCat() {
    for (var i = 0; i < UNIT_CATS.length; i++) {
      if (UNIT_CATS[i].k === S.unitFilter) return UNIT_CATS[i];
    }
    return UNIT_CATS[0];
  }
  function unitsView() {
    var h = '<div class="filters">';
    UNIT_CATS.forEach(function (c) {
      var n = UNITS.filter(c.test).length;
      h += '<button class="chip' + (S.unitFilter === c.k ? ' on' : '') + '" type="button" data-cat="' + c.k + '">' +
        esc(T(c.label)) + ' <span class="n">' + n + '</span></button>';
    });
    h += '</div>';
    var list = unitList();
    h += sectionTitle(T('unitsTitle'), list.length);
    list.forEach(function (u) {
      var i = UNITS.indexOf(u);
      var pts = '';
      var c0 = arr(u.cost)[0];
      if (c0 && arr(c0.items)[0]) pts = pick(c0.items[0].pts) + ' ' + ptsUnit();
      var faction = factionPair(u);
      var wep = unitWeapons(u), topM = topWeapon(wep.melee), topR = topWeapon(wep.ranged);
      var wline = [
        topM ? one('近', 'M') + ' ' + pick((S.lang === 'en') ? topM.name : topM.zh, topM.name, topM.zh) + ' ' + wstat(topM) : '',
        topR ? one('遠', 'R') + ' ' + pick((S.lang === 'en') ? topR.name : topR.zh, topR.name, topR.zh) + ' ' + wstat(topR) : ''
      ].filter(Boolean);
      var on = S.cmp.indexOf(i) >= 0;
      h += '<div class="unitrow">' +
        '<button class="card tap" type="button" data-unit="' + i + '"><div class="card-head"><div>' +
        nameHTML(u.zh, u.en, 'card-title') +
        '<div class="card-sub">' + esc(bi(faction.zh, faction.en)) + '</div>' +
        '</div><span class="chev"><svg class="ico" aria-hidden="true"><use href="#i-chev"></use></svg></span></div>' +
        '<div class="badges">' +
        '<span class="badge">M ' + esc(pick((u.stats || {}).M, '–')) + ' · T ' + esc(pick((u.stats || {}).T, '–')) +
        ' · SV ' + esc(pick((u.stats || {}).SV, '–')) + ' · W ' + esc(pick((u.stats || {}).W, '–')) + '</span>' +
        (pts ? '<span class="badge pts">' + esc(pts) + '</span>' : '') +
        (u.legend ? '<span class="badge legend">' + esc(T('legend')) + '</span>' : '') +
        (isSisters(u) ? '<span class="badge">' + esc(T('filterSisters')) + '</span>' : '') +
        '</div>' +
        (wline.length ? '<div class="card-sub wsum">' + esc(wline.join(' ｜ ')) + '</div>' : '') +
        '</button>' +
        '<button type="button" class="cmp-btn' + (on ? ' on' : '') + '" data-cmp="' + i + '" aria-pressed="' + (on ? 'true' : 'false') +
        '" aria-label="' + esc(T('compareAdd') + '：' + pick(u.zh, u.en)) + '">' + (on ? '✓' : '＋') + '</button>' +
        '</div>';
    });
    return h;
  }
  function unitList() {
    var cat = unitCat();
    return UNITS.filter(cat.test).slice().sort(function (a, b) {
      return str(a.en).localeCompare(str(b.en));
    });
  }
  function unitOrder() {
    var list = S.q ? UNITS.slice().sort(function (a, b) {
      return str(a.en).localeCompare(str(b.en));
    }) : unitList();
    return list.map(function (u) { return UNITS.indexOf(u); });
  }
  function glossSection(key, titleKey) {
    var items = arr(GLOSS[key]);
    if (!items.length) return '';
    var withText = items.filter(function (x) { return x && (x.text_en || x.text_zh || x.text || x.desc_en || x.desc_zh); });
    var h = sectionTitle(T(titleKey), items.length) + '<div class="card">';
    if (!withText.length) h += '<p class="missing">' + esc(T('glossPending')) + '</p>';
    items.forEach(function (x) {
      var en = pick(x.en, x.name_en, x.term_en);
      var zh = pick(x.zh, x.name_zh, x.term_zh);
      var textEn = pick(x.text_en, x.textEn, x.desc_en, x.definition_en, x.text);
      var textZh = pick(x.text_zh, x.textZh, x.desc_zh, x.definition_zh);
      var url = pick(x.url, x.source_url, x.link);
      h += '<div class="abil">' + nameHTML(zh, en, 'n');
      if (textZh || textEn) h += contentHTML(textZh, textEn);
      if (url) h += '<div class="c-en en-line"><a class="lnk" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(T('glossSource')) + '</a></div>';
      h += '</div>';
    });
    return h + '</div>';
  }
  function glossView() {
    var h = '';
    h += glossSection('usrs', 'glossUsr');
    h += glossSection('core', 'glossCore');
    h += glossSection('keywords', 'glossKw');
    h += dataSummaryCard();
    return h;
  }

  /* ---------- search ---------- */
  var INDEX = null;
  function addHit(out, kind, tz, te, sz, se, hay, route) {
    out.push({
      kind: kind, tz: str(tz), te: str(te), sz: str(sz), se: str(se),
      hay: (str(tz) + ' ' + str(te) + ' ' + str(sz) + ' ' + str(se) + ' ' + str(hay)).toLowerCase(),
      route: route
    });
  }
  function buildIndex() {
    var out = [];
    var intro = ARMY.intro || {}, fav = ARMY.favoured || {};
    addHit(out, 'army', '御林武藝', 'Martial Ka’tah', '', '', flat(intro) + ' ' + flat(fav), '#/army');
    arr(ARMY.ka_tahs).forEach(function (k) { addHit(out, 'kat', k.zh, k.en, '御林武藝', 'Martial Ka’tah', flat(k), '#/army'); });
    arr(ARMY.rules).forEach(function (r) { addHit(out, 'rule', r.zh, r.en, '軍隊規則', 'Army Rules', flat(r), '#/army'); });
    DETS.forEach(function (d, i) {
      addHit(out, 'det', d.zh, d.en, d.disp_zh, d.disp_en, flat(d), '#/det/' + i);
      enhanceList(d).forEach(function (e) { addHit(out, 'enh', e.zh, e.en, d.zh, d.en, flat(e), '#/det/' + i); });
      stratList(d).forEach(function (s) { addHit(out, 'strat', s.zh, s.en, d.zh, d.en, flat(s), '#/det/' + i); });
    });
    UNITS.forEach(function (u, i) {
      var f = factionPair(u);
      addHit(out, 'unit', u.zh, u.en, f.zh, f.en, flat(u), '#/unit/' + i);
    });
    ['usrs', 'core', 'keywords'].forEach(function (g) {
      var subKey = g === 'usrs' ? 'glossUsr' : (g === 'core' ? 'glossCore' : 'glossKw');
      arr(GLOSS[g]).forEach(function (x) {
        addHit(out, 'gloss', x.zh, x.en, L[subKey][0], L[subKey][1], flat(x), '#/gloss');
      });
    });
    INDEX = out;
  }
  function terms(q) {
    return str(q).toLowerCase().split(/\s+/).filter(Boolean);
  }
  function runSearch(q) {
    var ts = terms(q);
    if (!ts.length || !INDEX) return [];
    var hits = [];
    INDEX.forEach(function (x) {
      for (var i = 0; i < ts.length; i++) {
        if (x.hay.indexOf(ts[i]) < 0) return;
      }
      var score = 1;
      var titleHay = (x.tz + ' ' + x.te).toLowerCase();
      for (var j = 0; j < ts.length; j++) { if (titleHay.indexOf(ts[j]) >= 0) score = 0; }
      hits.push({ x: x, score: score });
    });
    hits.sort(function (a, b) { return a.score - b.score; });
    return hits.slice(0, 80).map(function (h) { return h.x; });
  }
  function hl(text, ts) {
    var s = esc(text);
    if (s.indexOf('&') >= 0) return s;
    ts.forEach(function (t) {
      if (t.length < 2) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      s = s.replace(re, '<mark>$1</mark>');
    });
    return s;
  }
  function hitName(x) {
    if (S.lang === 'en') return pick(x.te, x.tz);
    if (S.lang === 'zh') return pick(x.tz, x.te);
    return pick(x.tz, x.te);
  }
  function hitSub(x) {
    if (S.lang === 'en') return pick(x.se, x.sz);
    if (S.lang === 'zh') return pick(x.sz, x.se);
    return pick(x.sz, x.se);
  }
  function typeLabel(kind) {
    var map = {
      unit: 'typeUnit', det: 'typeDet', rule: 'typeRule', kat: 'typeKat',
      enh: 'typeEnh', strat: 'typeStrat', gloss: 'typeGloss', army: 'typeArmy'
    };
    return T(map[kind] || 'typeRule');
  }
  function searchView(q) {
    var ts = terms(q);
    var hits = runSearch(q);
    var h = sectionTitle(T('results'), hits.length);
    if (!hits.length) {
      h += '<div class="empty"><p>' + (S.lang === 'en'
        ? 'No results for “' + esc(q) + '”'
        : '找不到「' + esc(q) + '」') + '</p><p>' + esc(T('searchHint')) + '</p></div>';
      return h;
    }
    h += '<div class="card" style="padding:0;border-left-color:var(--line2)">';
    hits.forEach(function (x) {
      var sub = hitSub(x);
      h += '<button class="hit" type="button" data-route="' + esc(x.route) + '"><span><span class="t">' +
        hl(hitName(x), ts) + '</span>' + (sub ? '<span class="s">' + hl(sub, ts) + '</span>' : '') +
        '</span><span class="type">' + esc(typeLabel(x.kind)) + '</span></button>';
    });
    h += '</div>';
    return h;
  }

  /* ---------- about / offline sheet ---------- */
  var sw = { supported: ('serviceWorker' in navigator), reg: null, controlled: false, ready: false, version: '', waiting: false, error: '' };
  var installEvt = null;
  var diagCache = null;
  function platform() {
    var ua = str(navigator.userAgent);
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
  }
  function isInstalled() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) { /* ignore */ }
    return navigator.standalone === true;
  }
  function isOnline() { return navigator.onLine !== false; }
  function isLocalFile() {
    try { return location.protocol === 'file:'; } catch (e) { return false; }
  }
  function infoHTML() {
    var h = '';
    h += sectionTitle(T('offlineStatus'));
    h += '<div class="card">';
    h += '<div class="status-line"><span class="dot ' + (sw.ready ? 'ok' : 'warn') + '"></span>' +
      '<span class="lab">' + esc(T('statusLabel')) + '</span><span>' + esc(sw.ready ? T('ready') : T('notReady')) + '</span></div>';
    h += '<div class="status-line"><span class="dot ' + (isOnline() ? 'ok' : 'warn') + '"></span>' +
      '<span class="lab">' + esc(T('connection')) + '</span><span>' + esc(isOnline() ? T('online') : T('offline')) + '</span></div>';
    h += '<div class="status-line"><span class="dot"></span><span class="lab">' + esc(T('cacheVersion')) + '</span><span>' +
      esc(pick(sw.version, '–')) + '</span></div>';
    h += '<div class="status-line"><span class="dot"></span><span class="lab">' + esc(T('appVersion')) + '</span><span>' + esc(APP_VERSION) + '</span></div>';
    h += '<p class="muted info-list">' + esc(isLocalFile()
      ? bi('本機檔案模式：全部規則已內嵌在同一個檔案，毋須連線，亦不需要快取。', 'Local-file mode: every rule is embedded in this single file; no network or cache needed.')
      : (sw.supported ? (sw.error ? T('swError') + sw.error : T('offlineBanner')) : T('swUnsupported'))) + '</p>';
    h += '<button class="actionbtn" type="button" data-action="update">' + esc(T('updateNow')) + '</button>';
    h += '<button class="actionbtn" type="button" data-action="reload">' + esc(T('reloadApp')) + '</button>';
    h += '</div>';

    h += sectionTitle(one('語音監聽（實驗）', 'Voice monitor (experimental)'));
    h += '<div class="card"><p class="notes">' +
      esc(one('喺電腦或平板用 Chrome 開「語音監聽」，講出單位、武器、分隊或技能名，右邊會自動打開對應資料。iPhone 的 Safari 唔支援持續收音。',
        'Open the voice monitor in desktop Chrome: say a unit, weapon, detachment or ability name and the matching entry opens automatically. iPhone Safari cannot listen continuously.')) +
      '</p><p><a class="actionbtn" href="./listen.html" target="_blank" rel="noopener">' + esc(one('開啟語音監聽', 'Open voice monitor')) + '</a></p></div>';

    h += sectionTitle(T('installTitle'));
    h += '<div class="card">';
    if (isInstalled()) {
      h += '<p class="info-list">' + esc(T('installed')) + '</p>';
    } else if (platform() === 'ios') {
      h += '<ol class="info-list"><li>' + esc(T('installIos')) + '</li><li>' + esc(T('installIos2')) +
        '</li><li>' + esc(T('installIos3')) + '</li></ol>';
    } else {
      h += '<p class="info-list">' + esc(T('installOther')) + '</p>';
      if (installEvt) h += '<button class="actionbtn" type="button" data-action="install">' + esc(T('installBtn')) + '</button>';
    }
    h += '</div>';

    h += sectionTitle(T('dataTitle'));
    h += '<div class="card">' + dataSummaryBody() + '</div>';

    h += sectionTitle(T('diagnostics'));
    h += '<div class="card"><p class="muted info-list">' + esc(T('diagHint')) + '</p>' +
      '<button class="actionbtn" type="button" data-action="diag">' + esc(T('runDiag')) + '</button>' +
      '<div id="diagOut"></div></div>';

    h += '<div class="card"><p class="muted info-list">' + esc(T('disclaimer')) + '</p></div>';
    return h;
  }
  function dataSummaryBody() {
    var h = '';
    if (META && (META.checked_date || arr(META.sources).length || arr(META.corrections).length || META.limitations)) {
      if (META.checked_date) h += '<p class="src-line">' + esc(T('checkedDate')) + '：' + esc(META.checked_date) + '</p>';
      if (META.limitations) {
        h += '<h5 class="src-sub">' + esc(T('limitations')) + '</h5>' +
          (Array.isArray(META.limitations) ? noteList(META.limitations) : '<p class="src-line">' + esc(META.limitations) + '</p>');
      }
      if (arr(META.sources).length) h += '<h5 class="src-sub">' + esc(T('sources')) + '</h5>' + noteList(META.sources);
      if (META.original_url) h += '<p class="src-line"><a class="lnk" href="' + esc(META.original_url) + '" target="_blank" rel="noopener noreferrer">' + (S.lang === 'en' ? 'Full original PDF text in Traditional Chinese (54 pages)' : '原 PDF 完整繁體轉換（54 頁，未修改原文數值）') + '</a></p>';
      if (arr(META.corrections).length) h += '<details><summary class="src-sub">' + esc(T('corrections')) + ' (' + META.corrections.length + ')</summary>' + noteList(META.corrections) + '</details>';
    } else {
      h += '<p class="src-line muted">' + esc(T('dataPending')) + '</p>';
    }
    h += '<p class="src-line muted">' + esc(T('disclaimer')) + '</p>';
    return h;
  }

  /* ---------- diagnostics ---------- */
  function diagSync() {
    var out = {
      appVersion: APP_VERSION,
      generated: new Date().toISOString(),
      js: {
        dataJs: (window.DATA && typeof window.DATA === 'object'),
        appJs: true,
        units: UNITS.length,
        detachments: DETS.length,
        glossUsrs: arr(GLOSS.usrs).length,
        glossCore: arr(GLOSS.core).length,
        glossKeywords: arr(GLOSS.keywords).length,
        hasMeta: !!META
      },
      html: {},
      css: {},
      json: {}
    };
    ['#app', '#sheet', '#sheetBody', '#sheetTitle', '#backdrop', '#tabbar', '#search', '#clearSearch',
      '#langToggle', '#fontPlus', '#fontMinus', '#infoBtn', '#netbar', '#offlineNote'].forEach(function (sel) {
        out.html[sel] = !!$(sel);
      });
    try {
      var cs = window.getComputedStyle(document.documentElement);
      out.css.rootGold = cs.getPropertyValue('--gold').trim();
      out.css.fontSize = cs.getPropertyValue('--fs').trim();
      var sheetEl = $('#sheet');
      out.css.hiddenRuleWorks = sheetEl ? window.getComputedStyle(sheetEl).display === 'none' : null;
    } catch (e) {
      out.css.error = str(e && e.message);
    }
    return out;
  }
  function diagAsync() {
    var out = diagSync();
    var jobs = [
      fetch('./manus-routes.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (j) { out.json.routes = { ok: true, count: arr(j && j.routes).length }; })
        .catch(function (e) { out.json.routes = { ok: false, error: str(e && e.message) }; }),
      fetch('./manifest.webmanifest', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (j) { out.json.manifest = { ok: true, name: str(j && j.name), start: str(j && j.start_url) }; })
        .catch(function (e) { out.json.manifest = { ok: false, error: str(e && e.message) }; })
    ];
    return Promise.all(jobs).then(function () { return out; });
  }
  function renderDiag(el) {
    if (!el) return;
    el.innerHTML = '<div class="diag">Loading…</div>';
    diagAsync().then(function (out) {
      diagCache = out;
      el.innerHTML = '<div class="diag">' + esc(JSON.stringify(out, null, 1)) + '</div>';
      try { console.groupCollapsed('[Custodes] diagnostics'); console.log(out); console.groupEnd(); } catch (e) { /* ignore */ }
    }).catch(function (e) {
      el.innerHTML = '<div class="diag">' + esc('diagnostics failed: ' + str(e && e.message)) + '</div>';
    });
  }

  /* ---------- sheet ---------- */
  var sheetEl = $('#sheet'), backdropEl = $('#backdrop'), sheetBodyEl = $('#sheetBody'), sheetTitleEl = $('#sheetTitle');
  function showSheet(title, html, kind) {
    sheetTitleEl.textContent = S.table ? title + ' · ' + one('長按 × 關閉', 'long-press ×') : title;
    sheetBodyEl.innerHTML = html;
    sheetEl.hidden = false;
    backdropEl.hidden = false;
    document.body.style.overflow = 'hidden';
    S.sheet = kind || 'panel';
    try { sheetBodyEl.scrollTop = 0; } catch (e) { /* ignore */ }
    initSegnav();
    syncCmp();
    var closeBtn = $('#sheetClose');
    if (closeBtn && closeBtn.focus) closeBtn.focus();
  }
  function hideSheet() {
    if (!sheetEl || sheetEl.hidden) { S.sheet = null; return; }
    sheetEl.hidden = true;
    backdropEl.hidden = true;
    document.body.style.overflow = '';
    S.sheet = null;
  }
  function routeFallback(view) {
    var target = '#/' + view;
    try {
      if (window.history && history.replaceState) {
        history.replaceState(null, '', target);
        return;
      }
    } catch (e) { /* fall through */ }
    location.hash = target;
  }
  function closeSheet() {
    if (!sheetEl || sheetEl.hidden) return;
    var kind = S.sheet;
    hideSheet();
    if (kind === 'compare') { render(); return; }
    if (kind === 'route') {
      var r = parseHash();
      if (r.view === 'unit') { S.tab = 'units'; setTabs('units'); routeFallback('units'); }
      else if (r.view === 'det') { S.tab = 'dets'; setTabs('dets'); routeFallback('dets'); }
    }
  }

  /* ---------- in-page section navigation ---------- */
  var segSpy = null;
  function initSegnav() {
    var body = sheetBodyEl;
    if (!body) return;
    if (segSpy) { body.removeEventListener('scroll', segSpy); segSpy = null; }
    var nav = body.querySelector('#segnav');
    if (!nav) return;
    var btns = [].slice.call(nav.querySelectorAll('[data-sec]'));
    var secs = [].slice.call(body.querySelectorAll('[data-sect]'));
    function activate(id) {
      btns.forEach(function (b) { b.classList.toggle('on', b.dataset.sec === id); });
    }
    segSpy = function () {
      if (!btns.length) return;
      var top = body.getBoundingClientRect().top + 72;
      var cur = btns[0].dataset.sec;
      secs.forEach(function (s) {
        if (s.getBoundingClientRect().top <= top) cur = s.id;
      });
      activate(cur);
    };
    body.addEventListener('scroll', segSpy, { passive: true });
    segSpy();
  }
  function jumpTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var nav = document.getElementById('segnav');
    if (nav) {
      [].slice.call(nav.querySelectorAll('[data-sec]')).forEach(function (b) {
        b.classList.toggle('on', b.dataset.sec === id);
      });
    }
  }

  /* ---------- ability popover ---------- */
  var popEl = $('#pop'), popBackEl = $('#popBackdrop'), popBodyEl = $('#popBody'), popTitleEl = $('#popTitle');
  function openAb(term, zhTerm) {
    if (!popEl) return;
    var hit = findAb(term, zhTerm);
    var title = hit ? ((S.lang === 'en') ? pick(hit.en, term) : pick(hit.zh, zhTerm, term)) : pick(zhTerm, term);
    popTitleEl.textContent = title;
    var body = hit ? contentHTML(hit.text_zh, hit.text_en) : '';
    if (!hit) {
      body = '<p class="muted">' + esc(T('abMissing')) + '</p>' +
        '<p><button type="button" class="actionbtn" data-gloss="1">' + esc(T('abOpenGloss')) + '</button></p>';
    } else if (hit.url) {
      body += '<p class="src-line"><a class="lnk" href="' + esc(hit.url) + '" target="_blank" rel="noopener noreferrer">' + esc(T('glossSource')) + '</a></p>';
    }
    popBodyEl.innerHTML = body;
    popEl.hidden = false;
    popBackEl.hidden = false;
  }
  function closePop() {
    if (popEl) popEl.hidden = true;
    if (popBackEl) popBackEl.hidden = true;
  }

  /* ---------- compare ---------- */
  function toggleCmp(i) {
    var k = S.cmp.indexOf(i);
    if (k >= 0) S.cmp.splice(k, 1);
    else {
      if (S.cmp.length >= 4) { syncCmp(); return; }
      S.cmp.push(i);
    }
    syncCmp();
  }
  function cmpValue(u, key) {
    var st = u.stats || {};
    if (key === 'inv') return pick(st.INV, st.INSV, st.InSv, '–');
    return pick(st[key], '–');
  }
  function cmpPoints(u) {
    var c = arr(u.cost)[0], it = arr(c && c.items)[0];
    if (!it) return '–';
    return pick(it.pts) + ' ' + ptsUnit() + (it.models ? ' (' + it.models + ')' : '');
  }
  function cmpHTML() {
    if (!S.cmp.length) return '<p class="empty">' + esc(T('compareEmpty')) + '</p>';
    var us = S.cmp.map(function (i) { return UNITS[i]; }).filter(Boolean);
    var rows = [
      [T('points'), function (u) { return cmpPoints(u); }],
      ['M', function (u) { return cmpValue(u, 'M'); }],
      ['T', function (u) { return cmpValue(u, 'T'); }],
      ['SV', function (u) { return cmpValue(u, 'SV'); }],
      ['W', function (u) { return cmpValue(u, 'W'); }],
      ['LD', function (u) { return cmpValue(u, 'LD'); }],
      ['OC', function (u) { return cmpValue(u, 'OC'); }],
      ['INV', function (u) { return cmpValue(u, 'inv'); }]
    ];
    function weaponCell(u, melee) {
      var w = unitWeapons(u), top = topWeapon(melee ? w.melee : w.ranged);
      if (!top) return '–';
      var nm = (S.lang === 'en') ? pick(top.name, top.zh) : pick(top.zh, top.name);
      return nm + '<span class="cw">' + esc(wstat(top)) + '</span>';
    }
    rows.push([T('weaponsMelee'), function (u) { return weaponCell(u, true); }]);
    rows.push([T('weaponsRanged'), function (u) { return weaponCell(u, false); }]);
    var head = '<tr><th class="rowlab">' + esc(T('compareCol')) + '</th>' +
      us.map(function (u) { return '<th>' + esc(pick(u.zh, u.en)) + '<span class="ce">' + esc(pick(u.en)) + '</span></th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) {
      return '<tr><th class="rowlab">' + esc(r[0]) + '</th>' +
        us.map(function (u) { return '<td>' + r[1](u) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<div class="cmpwrap"><table class="cmptable"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<p><button type="button" class="actionbtn" data-cmpclear="1">' + esc(T('clearAll')) + '</button>' +
      '<button type="button" class="actionbtn" data-cmpclose="1">' + esc(T('close')) + '</button></p>';
  }
  function syncCmp() {
    var bar = $('#cmpbar');
    if (bar) bar.hidden = S.cmp.length === 0;
    var n = $('#cmpCount');
    if (n) n.textContent = T('compare') + ' ' + S.cmp.length + '/4';
    document.body.classList.toggle('has-cmp', S.cmp.length > 0);
    var btns = document.querySelectorAll('.cmp-btn[data-cmp]');
    for (var i = 0; i < btns.length; i++) {
      var on = S.cmp.indexOf(parseInt(btns[i].dataset.cmp, 10)) >= 0;
      btns[i].classList.toggle('on', on);
      btns[i].textContent = on ? '✓' : '＋';
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (S.sheet === 'compare' && sheetEl && !sheetEl.hidden && sheetBodyEl) {
      sheetBodyEl.innerHTML = cmpHTML();
    }
  }

  /* ---------- routing ---------- */
  var TAB_VIEWS = { army: 1, dets: 1, units: 1, gloss: 1 };
  function parseHash() {
    var raw = str(location.hash).replace(/^#\/?/, '');
    if (!raw) return { view: 'army' };
    var parts = raw.split('/');
    if (parts[0] === 'unit') return { view: 'unit', i: parseInt(parts[1], 10) };
    if (parts[0] === 'det') return { view: 'det', i: parseInt(parts[1], 10) };
    if (TAB_VIEWS[parts[0]]) return { view: parts[0] };
    return { view: 'army' };
  }
  function setTabs(tab) {
    var btns = document.querySelectorAll('#tabbar button');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].dataset.tab === tab;
      btns[i].classList.toggle('on', on);
      if (on) btns[i].setAttribute('aria-current', 'page');
      else btns[i].removeAttribute('aria-current');
    }
  }
  var scrollMem = {};
  function currentKey() { return str(location.hash) || '#/army'; }
  function paintTab(tab) {
    var view = { army: armyView, dets: detsView, units: unitsView, gloss: glossView }[tab] || armyView;
    appEl.innerHTML = view();
    document.body.dataset.view = tab;
  }
  function restoreScroll() {
    var y = scrollMem[currentKey()];
    window.scrollTo(0, y || 0);
  }
  function render() {
    if (S.q) {
      hideSheet();
      appEl.innerHTML = searchView(S.q);
      document.body.dataset.view = 'search';
      setTabs(null);
      return;
    }
    var r = parseHash();
    if (r.view === 'unit' && UNITS[r.i]) {
      S.tab = 'units';
      paintTab('units');
      setTabs('units');
      var uOrder = unitOrder();
      showSheet(T('tabUnits') + ' · ' + one('詳情', 'Detail'), unitHTML(UNITS[r.i], { order: uOrder, pos: uOrder.indexOf(r.i) }), 'route');
      return;
    }
    if (r.view === 'det' && DETS[r.i]) {
      S.tab = 'dets';
      paintTab('dets');
      setTabs('dets');
      var dOrder = detOrder();
      showSheet(T('tabDets') + ' · ' + one('詳情', 'Detail'), detHTML(DETS[r.i], { order: dOrder, pos: dOrder.indexOf(r.i) }), 'route');
      return;
    }
    hideSheet();
    var tab = TAB_VIEWS[r.view] ? r.view : 'army';
    S.tab = tab;
    paintTab(tab);
    setTabs(tab);
    restoreScroll();
  }
  function navigate(hash) {
    if (str(location.hash) === hash) { render(); return; }
    location.hash = hash;
  }

  /* ---------- language / font ---------- */
  function applyLang() {
    document.body.dataset.lang = S.lang;
    try { document.documentElement.lang = (S.lang === 'en') ? 'en' : 'zh-Hant'; } catch (e) { /* ignore */ }
    var tgl = $('#langToggle');
    if (tgl) tgl.textContent = S.lang === 'both' ? '中英' : (S.lang === 'zh' ? '中' : 'EN');
    var pairs = [
      ['#langToggle', 'language'], ['#fontMinus', 'smaller'], ['#fontPlus', 'larger'],
      ['#infoBtn', 'about'], ['#sheetClose', 'close'], ['#clearSearch', 'clear']
    ];
    pairs.forEach(function (p) {
      var el = $(p[0]);
      if (el) el.setAttribute('aria-label', T(p[1]));
    });
    var s = $('#search');
    if (s) {
      s.setAttribute('placeholder', T('search'));
      s.setAttribute('aria-label', T('search'));
    }
    var t = $('#tabbar');
    if (t) t.setAttribute('aria-label', bi('主要導覽', 'Main navigation'));
  }
  function applyFont() {
    var size = S.table ? Math.round(S.fs * 1.22) : S.fs;
    document.documentElement.style.setProperty('--fs', size + 'px');
  }

  /* ---------- table mode: big text, screen awake, guarded closing ---------- */
  var wakeSentinel = null;
  function requestWake() {
    if (!('wakeLock' in navigator) || !S.table) return;
    try {
      navigator.wakeLock.request('screen').then(function (sentinel) {
        wakeSentinel = sentinel;
        sentinel.addEventListener('release', function () { wakeSentinel = null; });
      }).catch(function () { /* not available */ });
    } catch (e) { /* ignore */ }
  }
  function releaseWake() {
    if (wakeSentinel) { try { wakeSentinel.release(); } catch (e) { /* ignore */ } wakeSentinel = null; }
  }
  var toastTimer = null;
  function showToast(text) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
  }
  function applyTable(announce) {
    document.body.classList.toggle('table-mode', !!S.table);
    var b = $('#tableBtn');
    if (b) {
      b.classList.toggle('on', !!S.table);
      b.setAttribute('aria-pressed', S.table ? 'true' : 'false');
      b.setAttribute('aria-label', T('tableMode'));
    }
    applyFont();
    if (S.table) { requestWake(); if (announce) showToast(T('tableOn')); }
    else { releaseWake(); if (announce) showToast(T('tableOff')); }
  }
  document.addEventListener('visibilitychange', function () {
    if (S.table && document.visibilityState === 'visible') requestWake();
  });
  function bumpFont(delta) {
    S.fs = Math.min(26, Math.max(15, S.fs + delta));
    writeStore('cu.fs', S.fs);
    applyFont();
  }

  /* ---------- offline note / netbar ---------- */
  function updateNet() {
    var bar = $('#netbar');
    if (bar) {
      if (isOnline()) { bar.hidden = true; bar.textContent = ''; }
      else { bar.textContent = T('offlineBanner'); bar.hidden = false; }
    }
    updateOfflineNote();
  }
  function updateOfflineNote() {
    var el = $('#offlineNote');
    if (!el) return;
    if (isLocalFile()) {
      el.textContent = bi('離線單檔模式：全部內容已內嵌，毋須連線。',
        'Single-file offline mode: all content is embedded, no connection needed.');
      return;
    }
    var parts = [];
    parts.push(isOnline() ? T('online') : T('offline'));
    parts.push(T('offlineStatus') + '：' + (sw.ready ? T('ready') : T('notReady')));
    if (sw.version) parts.push(sw.version);
    el.textContent = parts.join(' · ');
    if (S.sheet === 'panel' && sheetEl && !sheetEl.hidden && sheetBodyEl) {
      sheetBodyEl.innerHTML = infoHTML();
    }
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var target = e.target;
    var btn = target && target.closest ? target.closest('[data-unit],[data-det],[data-route],[data-cat],[data-detfilter],[data-info],[data-action],[data-sec],[data-ab],[data-cmp],[data-nav],[data-cmpopen],[data-cmpclear],[data-cmpclose],[data-gloss]') : null;
    if (!btn) return;
    var ds = btn.dataset || {};
    if (ds.sec) { jumpTo(ds.sec); return; }
    if (ds.ab) { openAb(ds.ab, ds.abzh); return; }
    if (ds.cmp !== undefined && ds.cmp !== '') { toggleCmp(parseInt(ds.cmp, 10)); return; }
    if (ds.nav) {
      var np = ds.nav.split(':');
      if (np[1] && np[1] !== '-') navigate((np[0] === 'det' ? '#/det/' : '#/unit/') + np[1]);
      return;
    }
    if ('cmpopen' in ds) { showSheet(T('compare'), cmpHTML(), 'compare'); return; }
    if ('cmpclear' in ds) { S.cmp = []; syncCmp(); return; }
    if ('cmpclose' in ds) { closeSheet(); return; }
    if ('gloss' in ds) { closePop(); clearSearchInput(); navigate('#/gloss'); return; }
    if (ds.cat) {
      S.unitFilter = ds.cat;
      scrollMem[currentKey()] = window.scrollY;
      paintTab('units');
      syncCmp();
      window.scrollTo(0, 0);
      return;
    }
    if (ds.detfilter) {
      S.detFilter = ds.detfilter;
      scrollMem[currentKey()] = window.scrollY;
      paintTab('dets');
      window.scrollTo(0, 0);
      return;
    }
    if (ds.unit !== undefined && ds.unit !== '') {
      scrollMem[currentKey()] = window.scrollY;
      navigate('#/unit/' + ds.unit);
      return;
    }
    if (ds.det !== undefined && ds.det !== '') {
      scrollMem[currentKey()] = window.scrollY;
      navigate('#/det/' + ds.det);
      return;
    }
    if (ds.route) { navigate(ds.route); return; }
    if (ds.info !== undefined) { openInfo(); return; }
    if (ds.action) {
      if (ds.action === 'update') { doUpdate(); }
      else if (ds.action === 'reload') { location.reload(); }
      else if (ds.action === 'install') { promptInstall(); }
      else if (ds.action === 'diag') { renderDiag($('#diagOut')); }
    }
  });

  var appEl = $('#app');
  var tabbarEl = $('#tabbar');
  if (tabbarEl) {
    tabbarEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-tab]') : null;
      if (!b) return;
      clearSearchInput();
      scrollMem['#/' + b.dataset.tab] = 0;
      navigate('#/' + b.dataset.tab);
      window.scrollTo(0, 0);
    });
  }

  var langBtn = $('#langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      S.lang = S.lang === 'both' ? 'zh' : (S.lang === 'zh' ? 'en' : 'both');
      writeStore('cu.lang', S.lang);
      applyLang();
      closePop();
      if (S.sheet === 'panel' && sheetBodyEl) sheetBodyEl.innerHTML = infoHTML();
      render();
    });
  }
  var minusBtn = $('#fontMinus');
  if (minusBtn) minusBtn.addEventListener('click', function () { bumpFont(-1); });
  var plusBtn = $('#fontPlus');
  if (plusBtn) plusBtn.addEventListener('click', function () { bumpFont(1); });
  var infoBtn = $('#infoBtn');
  if (infoBtn) infoBtn.addEventListener('click', function () { openInfo(); });
  var tableBtn = $('#tableBtn');
  if (tableBtn) {
    tableBtn.addEventListener('click', function () {
      S.table = !S.table;
      writeStore('cu.table', S.table ? '1' : '0');
      applyTable(true);
    });
  }

  var searchEl = $('#search');
  var clearEl = $('#clearSearch');
  var searchTimer = null;
  function clearSearchInput() {
    S.q = '';
    if (searchEl) searchEl.value = '';
    if (clearEl) clearEl.hidden = true;
  }
  if (searchEl) {
    searchEl.addEventListener('input', function () {
      var v = searchEl.value;
      if (clearEl) clearEl.hidden = !v;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        S.q = str(v).trim();
        render();
      }, 110);
    });
    searchEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { clearSearchInput(); render(); }
    });
  }
  if (clearEl) {
    clearEl.addEventListener('click', function () { clearSearchInput(); render(); });
  }
  var sheetCloseBtn = $('#sheetClose');
  if (sheetCloseBtn) {
    var holdTimer = null, holdFired = false;
    sheetCloseBtn.addEventListener('pointerdown', function () {
      if (!S.table) return;
      holdFired = false;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(function () { holdFired = true; closeSheet(); }, 550);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
      sheetCloseBtn.addEventListener(evt, function () {
        clearTimeout(holdTimer);
        if (S.table && !holdFired) showToast(T('holdToClose'));
      });
    });
    sheetCloseBtn.addEventListener('click', function () {
      if (!S.table) closeSheet();
    });
  }
  if (backdropEl) backdropEl.addEventListener('click', function () {
    if (S.table) { showToast(T('holdToClose')); return; }
    closeSheet();
  });
  var popCloseBtn = $('#popClose');
  if (popCloseBtn) popCloseBtn.addEventListener('click', closePop);
  if (popBackEl) popBackEl.addEventListener('click', closePop);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (popEl && !popEl.hidden) { closePop(); return; }
    if (sheetEl && !sheetEl.hidden) closeSheet();
  });

  window.addEventListener('hashchange', function () {
    clearSearchInput();
    render();
  });
  var scrollTick = false;
  window.addEventListener('scroll', function () {
    if (sheetEl && !sheetEl.hidden) return;
    if (scrollTick) return;
    scrollTick = true;
    setTimeout(function () {
      scrollTick = false;
      scrollMem[currentKey()] = window.scrollY;
    }, 150);
  }, { passive: true });
  window.addEventListener('online', updateNet);
  window.addEventListener('offline', updateNet);
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
  });

  function openInfo() {
    showSheet(T('infoTitle'), infoHTML(), 'panel');
  }
  function doUpdate() {
    if (sw.reg && sw.reg.update) {
      sw.reg.update().then(function () {
        if (sw.reg.waiting) sw.reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }).catch(function () { /* ignore */ });
    }
    setTimeout(function () { location.reload(); }, 600);
  }
  function promptInstall() {
    if (!installEvt) return;
    try { installEvt.prompt(); } catch (e) { /* ignore */ }
    installEvt = null;
  }

  /* ---------- service worker ---------- */
  function initSW() {
    if (isLocalFile()) { updateOfflineNote(); return; }
    if (!sw.supported) { updateOfflineNote(); return; }
    try {
      navigator.serviceWorker.addEventListener('message', function (e) {
        var d = e.data || {};
        if (d.type === 'READY' || d.type === 'STATUS') {
          sw.version = pick(d.version, d.cache);
          sw.ready = true;
          updateOfflineNote();
        }
      });
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        sw.controlled = true;
        updateOfflineNote();
      });
    } catch (e) { /* ignore */ }
    if (navigator.serviceWorker.controller) {
      sw.controlled = true;
      sw.ready = true;
      try { navigator.serviceWorker.controller.postMessage({ type: 'STATUS' }); } catch (e) { /* ignore */ }
    }
    var register = function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        sw.reg = reg;
        sw.ready = true;
        updateOfflineNote();
        if (navigator.serviceWorker.controller) {
          try { navigator.serviceWorker.controller.postMessage({ type: 'STATUS' }); } catch (e) { /* ignore */ }
        }
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.waiting = true;
              updateOfflineNote();
            }
          });
        });
      }).catch(function (e) {
        sw.error = str(e && e.message);
        updateOfflineNote();
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  }

  /* ---------- boot ---------- */
  buildIndex();
  applyLang();
  applyFont();
  applyTable(false);
  updateNet();
  if (!location.hash) {
    try { history.replaceState(null, '', '#/army'); } catch (e) { location.hash = '#/army'; }
  }
  render();
  initSW();

  /* ---------- test / diagnostic hooks (read-only helpers) ---------- */
  window.CUSTODES = window.CUSTODES || {};
  window.CUSTODES.version = APP_VERSION;
  window.CUSTODES.state = S;
  window.CUSTODES.views = {
    army: armyView, dets: detsView, units: unitsView, gloss: glossView,
    unit: unitHTML, det: detHTML, search: searchView, info: infoHTML, render: render
  };
  window.CUSTODES.diag = function () { return diagAsync(); };
  window.CUSTODES.counts = { units: UNITS.length, detachments: DETS.length };
})();
