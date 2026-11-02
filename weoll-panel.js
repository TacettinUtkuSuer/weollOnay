(function () {
  'use strict';
  if (window.__weoll) { window.__weoll.destroy(); return; } // 2. tıklama = kapat

  const SEL = {
    user: 'a.myspace-button div[style*="font-size: 14px"]',
    rows: '#portal-table tr[data-index]',
    icon: 'td.row-icon-table div',
    link: 'a[href*="/forms/submission?id="]',
    card: '.user-card-v0',
    yes: 'input[type="radio"][value="Evet"]',
    modal: '.confirmation-modal__actions button.btn-success, .modal-dialog button.btn-success'
  };
  const GREEN = '#c8f7c5', RED = '#f9c6c6';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
  const visible = el => !!el && el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).display !== 'none';
  async function waitFor(fn, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { const v = fn(); if (v) return v; } catch (e) {}
      await sleep(250);
    }
    return null;
  }

  /* ---------- Panel ---------- */
  const panel = document.createElement('div');
  panel.id = 'wb-panel';
  panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;width:250px;background:#fff;border:1px solid #888;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.35);font:12px Arial,sans-serif;padding:8px;color:#222';
  panel.innerHTML =
    '<div style="font-weight:bold;margin-bottom:6px">Weoll Otomatik Onay</div>' +
    '<div style="display:flex;gap:4px;margin-bottom:6px">' +
    '<button id="wb-all" style="flex:1">Tümünü Seç</button>' +
    '<button id="wb-start" style="flex:1">Başlat</button>' +
    '<button id="wb-stop" style="flex:1">Durdur</button></div>' +
    '<div id="wb-info" style="min-height:34px;padding:4px;border-radius:4px;background:#eee"></div>';
  document.body.appendChild(panel);
  const $ = id => panel.querySelector(id);
  const btnAll = $('#wb-all'), btnStart = $('#wb-start'), btnStop = $('#wb-stop'), info = $('#wb-info');

  /* ---------- iframe ---------- */
  const fr = document.createElement('iframe');
  fr.id = 'w-if';
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:1280px;height:900px;opacity:0;pointer-events:none;border:0;z-index:-1';
  document.body.appendChild(fr);
  function load(url) {
    return new Promise(res => {
      const t = setTimeout(res, 20000);
      fr.onload = () => { clearTimeout(t); res(); };
      fr.src = url;
    }).then(() => sleep(3500));
  }

  /* ---------- Durum ---------- */
  let running = false, warn = false;
  function setInfo(msg, bad) {
    info.textContent = msg;
    info.style.background = bad ? '#f8d0d0' : '#eee';
    info.style.color = bad ? '#b00020' : '#222';
    info.style.fontWeight = bad ? 'bold' : 'normal';
  }

  /* ---------- Ön kontroller ---------- */
  function getUser() {
    const el = document.querySelector(SEL.user);
    return visible(el) ? el.textContent.trim() : '';
  }
  function senderOk() {
    return [...document.querySelectorAll('tr ' + SEL.card)].some(visible);
  }
  function safety() {
    const user = getUser(), sender = senderOk();
    return { ok: !!user && sender, user };
  }

  /* ---------- Checkbox enjeksiyonu ---------- */
  function inject() {
    document.querySelectorAll(SEL.rows).forEach(row => {
      if (row.querySelector('.wb-cb')) return;
      const icon = row.querySelector(SEL.icon);
      if (!icon) return;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'wb-cb';
      cb.style.cssText = 'width:18px;height:18px;cursor:pointer';
      cb.addEventListener('click', e => e.stopPropagation());
      icon.style.display = 'none';
      icon.parentNode.insertBefore(cb, icon);
    });
  }
  const findRow = href => [...document.querySelectorAll(SEL.rows)].find(r => {
    const a = r.querySelector(SEL.link);
    return a && a.href === href;
  });
  function paint(href, color, uncheck) {
    const r = findRow(href);
    if (!r) return;
    r.style.setProperty('background', color, 'important');
    r.querySelectorAll('td').forEach(td => td.style.setProperty('background', color, 'important'));
    if (uncheck) { const cb = r.querySelector('.wb-cb'); if (cb) cb.checked = false; }
  }

  /* ---------- Form içi yardımcılar ---------- */
  const LOG = (...a) => console.log('[Weoll]', ...a);
  const findApprove = doc => {
    const btns = [...doc.querySelectorAll('button')];
    return btns.find(b => /^onayla(\s*\(|\s*$)/i.test(b.textContent.trim().replace(/\s+/g, ' '))) ||
      doc.querySelector('button.btn-success');
  };
  function setYes(doc, radio) {
    radio.click();
    if (!radio.checked) {
      const lbl = radio.closest('label') || (radio.id && doc.querySelector('label[for="' + radio.id + '"]'));
      if (lbl) lbl.click();
    }
    if (!radio.checked) radio.checked = true;
    ['input', 'change'].forEach(t => radio.dispatchEvent(new Event(t, { bubbles: true })));
  }
  const findModalBtn = doc =>
    doc.querySelector(SEL.modal) ||
    [...doc.querySelectorAll('.modal button, .modal-dialog button')]
      .find(b => /^(evet|onayla)$/i.test(b.textContent.trim()) && visible(b));

  /* ---------- Tek form işleme ---------- */
  async function processOne(item, userNorm) {
    await load(item.href);
    let doc = fr.contentDocument; // aynı origin olmalı
    if (!(await waitFor(() => findApprove(fr.contentDocument), 10000))) return 'Onayla butonu bulunamadı';
    doc = fr.contentDocument;

    const s = norm(item.sender);
    if (!s) return 'Gönderen okunamadı';
    const same = s === userNorm || s.includes(userNorm) || userNorm.includes(s);
    LOG('gönderen=', s, '| kullanıcı=', userNorm, '| eşleşme=', same);
    if (same) { // DURUM A
      const radio = await waitFor(() => doc.querySelector(SEL.yes), 5000);
      if (!radio) return '"Evet" radyosu bulunamadı';
      setYes(doc, radio);
      await sleep(600);
      LOG('evet işaretli mi:', radio.checked);
      if (!radio.checked) return '"Evet" işaretlenemedi';
    }
    const ab = findApprove(doc);
    LOG('onayla butonu:', ab && ab.textContent.trim(), 'disabled=', ab && ab.disabled);
    if (ab.disabled) return 'Onayla butonu pasif';
    ab.click(); // DURUM B doğrudan buraya düşer
    const m = await waitFor(() => findModalBtn(doc), 5000);
    LOG('modal butonu:', m && m.textContent.trim());
    if (m) m.click();
    await sleep(2000);

    // CHECK
    await load(item.href + (item.href.includes('?') ? '&' : '?') + 'check=1');
    const d = fr.contentDocument;
    const ok = await waitFor(() => {
      const txt = d.body.innerText || '';
      return txt.length > 50 && (!findApprove(d) || /Onaylandı|Onaylanan Süreç/.test(txt));
    }, 4000);
    return ok ? null : 'Doğrulama başarısız';
  }

  /* ---------- Ana döngü ---------- */
  async function run() {
    const c = safety();
    if (!c.ok) return;
    const userNorm = norm(c.user);
    const items = [...document.querySelectorAll(SEL.rows)]
      .filter(r => r.querySelector('.wb-cb') && r.querySelector('.wb-cb').checked)
      .map(r => {
        const a = r.querySelector(SEL.link), card = r.querySelector(SEL.card);
        return a ? { href: a.href, sender: card ? card.innerText : '' } : null;
      }).filter(Boolean);
    if (!items.length) { setInfo('Önce form seçin.'); return; }

    running = true; btnStart.disabled = true;
    let okN = 0, failN = 0;
    for (let i = 0; i < items.length && running; i++) {
      setInfo('İşleniyor ' + (i + 1) + '/' + items.length + ' (✓' + okN + ' ✗' + failN + ')');
      let err;
      try { err = await processOne(items[i], userNorm); }
      catch (e) { err = 'Hata: ' + e.message; }
      if (!running) { err = err || null; }
      if (err) { failN++; paint(items[i].href, RED, false); console.warn('[Weoll]', items[i].href, err); }
      else { okN++; paint(items[i].href, GREEN, true); }
    }
    const stopped = !running;
    running = false;
    fr.src = 'about:blank';
    setInfo((stopped ? 'Durduruldu. ' : 'Bitti. ') + '✓' + okN + ' ✗' + failN);
  }

  /* ---------- Olaylar ---------- */
  btnAll.onclick = () => {
    const cbs = [...document.querySelectorAll('.wb-cb')];
    const all = cbs.every(c => c.checked);
    cbs.forEach(c => c.checked = !all);
  };
  btnStart.onclick = () => { if (!running) run(); };
  btnStop.onclick = () => { running = false; };

  const timer = setInterval(() => {
    inject();
    const c = safety();
    if (!c.ok) {
      warn = true;
      if (running) running = false; // güvenlik: işlemi kes
      btnStart.disabled = true;
      setInfo('Sol menüyü açın veya ekranı uzaklaştırın' +
        (!c.user ? ' (kullanıcı adı okunamıyor)' : '') +
        (!senderOk() ? ' (Gönderen sütunu gizli)' : ''), true);
    } else {
      btnStart.disabled = running;
      if (warn) { warn = false; setInfo('Hazır. Kullanıcı: ' + c.user); }
      else if (!running && !info.textContent) setInfo('Hazır. Kullanıcı: ' + c.user);
    }
  }, 1000);
  inject();

  window.__weoll = {
    destroy() {
      clearInterval(timer); running = false;
      panel.remove(); fr.remove();
      document.querySelectorAll('.wb-cb').forEach(cb => {
        const ic = cb.nextElementSibling; if (ic) ic.style.display = '';
        cb.remove();
      });
      delete window.__weoll;
    }
  };
})();
