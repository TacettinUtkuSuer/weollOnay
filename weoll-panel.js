(function () {
  'use strict';
  if (window.__weoll) { window.__weoll.destroy(); return; } // 2. tıklama = kapat

  /* ---------- Sayfa kısıtı ---------- */
  const TARGET = 'https://my.weoll.com/forms/steps/waiting';

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
  panel.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;width:250px;background:#fff;border:1px solid #888;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.35);font:12px Arial,sans-serif;padding:8px;color:#222';
  panel.innerHTML =
    '<div style="font-weight:bold;margin-bottom:6px">Weoll Otomatik Onay</div>' +
    '<div style="display:flex;gap:4px;margin-bottom:6px">' +
    '<button id="wb-all" style="flex:1">Tümünü Seç</button>' +
    '<button id="wb-start" style="flex:1">Başlat</button>' +
    '<button id="wb-stop" style="flex:1">Durdur</button></div>' +
    '<div id="wb-info" style="min-height:34px;padding:4px;border-radius:4px;background:#eee"></div>';
  document.body.appendChild(panel);
  const $ = id => panel.querySelector(id);
  const pageOk = () => location.hostname === 'my.weoll.com' && location.pathname.startsWith('/forms/steps/waiting');
  const wrong = document.createElement('div');
  wrong.style.cssText = 'display:none;position:fixed;left:12px;bottom:12px;z-index:2147483647;width:250px;background:#fff;border:1px solid #b00020;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.35);font:12px Arial,sans-serif;padding:8px;color:#222';
  wrong.innerHTML = '<div style="color:#b00020;font-weight:bold;margin-bottom:6px">Bu sayfa uygun değil</div>' +
    '<button style="width:100%;padding:4px">Doğru sayfaya git</button>';
  function goTarget() {
    const a = document.querySelector('a[href*="/forms/steps/waiting"]');
    if (a) { a.click(); return; }                       // menüdeki linke tıkla (yenileme yok)
    history.pushState({}, '', '/forms/steps/waiting');   // yönlendiriciyi tetikle
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    setTimeout(() => { if (!document.querySelector('#portal-table')) location.href = TARGET; }, 2000); // son çare: tam yenileme
  }
  wrong.querySelector('button').onclick = goTarget;
  document.body.appendChild(wrong);
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
  function removeCheckboxes() {
    document.querySelectorAll('.wb-cb').forEach(cb => {
      const ic = cb.nextElementSibling; if (ic) ic.style.display = '';
      cb.remove();
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
    if (!(await waitFor(() => findApprove(fr.contentDocument), 12000))) {
      const t = (fr.contentDocument.body && fr.contentDocument.body.innerText) || '';
      if (/Onaylandı|Onaylanan Süreç/.test(t)) return null; // zaten onaylı
      return 'Onayla butonu bulunamadı';
    }
    doc = fr.contentDocument;
    await sleep(1500); // Formio olayları bağlansın (ilk yüklemede tık boşa gidiyordu)

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

    // CHECK (katı): form tam render olmadan "başarılı" sayılmaz
    await load(item.href + (item.href.includes('?') ? '&' : '?') + 'check=1');
    const d = fr.contentDocument;
    const state = () => {
      const txt = d.body ? (d.body.innerText || '') : '';
      const rendered = !!d.querySelector('.formio-form') || /Cevabım/.test(txt);
      const done = /Onaylandı|Onaylanan Süreç/.test(txt);
      const btn = findApprove(d);
      return { txt, rendered, done, btn };
    };
    let res = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      const st = state();
      if (st.done) { res = 'ok'; break; }
      if (st.rendered && st.btn) { res = 'fail'; break; }          // buton hâlâ var
      if (st.rendered && !st.btn) {                                 // render oldu, buton yok -> 2 sn sonra tekrar bak
        await sleep(2000);
        const st2 = state();
        res = st2.btn ? 'fail' : 'ok';
        break;
      }
      await sleep(500);
    }
    const fin = state();
    LOG('check sonucu:', res, '| rendered=', fin.rendered, '| buton=', !!fin.btn, '| metin=', fin.txt.slice(0, 150).replace(/\s+/g, ' '));
    if (res === 'ok') return null;
    return res === 'fail' ? 'Onayla butonu hâlâ duruyor (onaylanmadı)' : 'Doğrulanamadı (form render olmadı)';
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
      for (let k = 1; k <= 2 && running; k++) {          // başarısızsa 1 kez daha dene
        try { err = await processOne(items[i], userNorm); }
        catch (e) { err = 'Hata: ' + e.message; }
        if (!err) break;
        LOG('deneme', k, 'başarısız:', err);
      }
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

  const tick = () => {
    if (!pageOk()) {                       // SPA içinde başka sayfaya geçildi
      running = false;
      removeCheckboxes();
      panel.style.display = 'none';
      wrong.style.display = 'block';
      return;
    }
    if (wrong.style.display !== 'none') { wrong.style.display = 'none'; panel.style.display = 'block'; }
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
  };
  const timer = setInterval(tick, 1000);
  tick();

  window.__weoll = {
    destroy() {
      clearInterval(timer); running = false;
      panel.remove(); wrong.remove(); fr.remove();
      removeCheckboxes();
      delete window.__weoll;
    }
  };
})();
