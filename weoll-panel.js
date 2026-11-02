(function() {
    if (document.getElementById('weoll-panel')) return;

    // 1. ARAYÜZ
    var p = document.createElement('div');
    p.id = 'weoll-panel';
    p.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#fff;border:2px solid #004d71;border-radius:8px;padding:12px;width:300px;font-family:sans-serif;font-size:12px;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    p.innerHTML = `
        <div style="font-weight:bold;margin-bottom:6px;display:flex;justify-content:space-between;color:#004d71;">
            <span>Weoll Net Onay</span>
            <span style="cursor:pointer;color:#888;font-size:14px;" id="w-x">✖</span>
        </div>
        <div id="w-warning" style="display:none;background:#f8d7da;color:#dc3545;padding:8px;border-radius:4px;margin-bottom:8px;font-weight:bold;border:1px solid #dc3545;">
            ⚠️ Ekrana çok zoom yapılmış!<br>"Gönderen" sütunu görünmüyor.<br>Lütfen Ctrl ve Eksi (-) tuşuyla ekranı uzaklaştırın.
        </div>
        <div id="w-st" style="margin-bottom:8px;color:#555;">Hazır. Form seçin.</div>
        <div style="display:flex;gap:4px;margin-bottom:8px;">
            <button id="w-btn-all" style="flex:1;background:#6c757d;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;">Tümünü Seç</button>
            <button id="w-btn-go" style="flex:1.5;background:#28a745;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:bold;">Seçilenleri Onayla</button>
        </div>
        <iframe id="w-if" style="width:100%;height:80px;border:1px dashed #ccc;border-radius:4px;background:#fafafa;"></iframe>
    `;
    document.body.appendChild(p);

    var ifr = document.getElementById('w-if');
    var st = document.getElementById('w-st');
    var warningEl = document.getElementById('w-warning');
    var btnGo = document.getElementById('w-btn-go');
    
    // KENDİ İSMİNİ BUL
    var myName = "";
    var nameNode = document.querySelector('a.myspace-button div[style*="font-size: 14px"]');
    if (nameNode) myName = nameNode.textContent.trim();

    var selected = new Set();
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // 2. ZOOM VE GÖRÜNÜRLÜK KONTROLÜ (GİZLİYSE BUTONU KİLİTLE)
    setInterval(function() {
        var isVisible = false;
        document.querySelectorAll('tr[data-index]').forEach(row => {
            var userCard = row.querySelector('.user-card-v0');
            // offsetWidth > 0 demek ekranda fiziken yer kaplıyor ve görünüyor demektir
            if (userCard && userCard.offsetWidth > 0) isVisible = true;
        });
        
        if (!isVisible && document.querySelectorAll('tr[data-index]').length > 0) {
            warningEl.style.display = 'block';
            btnGo.disabled = true;
            btnGo.style.opacity = '0.4';
            btnGo.style.cursor = 'not-allowed';
        } else {
            warningEl.style.display = 'none';
            btnGo.disabled = false;
            btnGo.style.opacity = '1';
            btnGo.style.cursor = 'pointer';
        }
    }, 1000);

    // 3. BASİT CHECKBOX EKLEME
    setInterval(function() {
        document.querySelectorAll('tr[data-index]').forEach(row => {
            var link = row.querySelector('a[href*="/forms/submission?id="]');
            var td = row.querySelector('td.row-icon-table');
            if (!link || !td || td.querySelector('.w-cb')) return;
            
            var orig = td.querySelector('div');
            if (orig) orig.style.display = 'none';
            
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'w-cb';
            cb.style.cssText = 'width:16px;height:16px;cursor:pointer;';
            cb.checked = selected.has(link.href);
            
            cb.onchange = function() {
                if (this.checked) {
                    selected.add(link.href);
                    row.style.backgroundColor = '#e8f4fd';
                } else {
                    selected.delete(link.href);
                    row.style.backgroundColor = '';
                }
            };
            td.appendChild(cb);
        });
    }, 1000);

    document.getElementById('w-btn-all').onclick = function() {
        var links = document.querySelectorAll('a[href*="/forms/submission?id="]');
        var cbs = document.querySelectorAll('.w-cb');
        var selectAll = selected.size < links.length;
        
        links.forEach((link, i) => {
            var row = link.closest('tr');
            if (selectAll) {
                selected.add(link.href);
                if (cbs[i]) cbs[i].checked = true;
                if (row) row.style.backgroundColor = '#e8f4fd';
            } else {
                selected.delete(link.href);
                if (cbs[i]) cbs[i].checked = false;
                if (row) row.style.backgroundColor = '';
            }
        });
    };

    document.getElementById('w-x').onclick = function() {
        p.remove();
        document.querySelectorAll('.w-cb').forEach(c => c.remove());
        document.querySelectorAll('td.row-icon-table div').forEach(d => d.style.display = '');
    };

    // 4. ONAY İŞLEMİ VE DOĞRULAMA (REFRESH)
    async function processForm(url) {
        var link = document.querySelector(`a[href="${url}"]`);
        var row = link ? link.closest('tr') : null;
        var formId = link ? link.innerText.trim() : "Form";
        
        var isSelf = false;
        var userCard = row ? row.querySelector('.user-card-v0') : null;
        if (userCard && myName && userCard.textContent.toLowerCase().includes(myName.toLowerCase())) {
            isSelf = true;
        }

        st.innerHTML = `<b>#${formId}</b> işleniyor... <br>${isSelf ? '(Evet + Onay)' : '(Sadece Onay)'}`;
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.outline = '3px solid #ff9800';
        }

        ifr.src = url;
        await sleep(3500);

        var doc = ifr.contentDocument || ifr.contentWindow.document;
        var clicked = false;

        for (var i = 0; i < 8; i++) {
            var rad = doc.querySelector('input[type="radio"][value="Evet"]');
            var btn = Array.from(doc.querySelectorAll('button')).find(b => b.innerText.includes('Onayla')) || doc.querySelector('button.btn-success');
            
            if (isSelf && rad && btn) {
                var lbl = doc.querySelector(`label[for="${rad.id}"]`) || rad.parentElement;
                if (lbl) lbl.click();
                rad.click();
                await sleep(500);
                btn.click();
                clicked = true;
                break;
            } else if (!isSelf && btn) {
                btn.click();
                clicked = true;
                break;
            }
            await sleep(1000);
        }

        if (!clicked) {
            st.innerHTML = `<b>#${formId}</b> HATA: Buton bulunamadı!`;
            if (row) row.style.outline = '2px solid #dc3545';
            return;
        }

        // Pop-up onay penceresini bul ve bas
        await sleep(1000);
        var modalBtn = doc.querySelector('.modal-dialog button.btn-success, .confirmation-modal__actions button.btn-success');
        if (modalBtn) {
            modalBtn.click();
        } else {
            Array.from(doc.querySelectorAll('.modal.show button, .confirmation-modal button')).forEach(b => {
                if(b.innerText.includes('Evet') || b.innerText.includes('Onayla')) b.click();
            });
        }

        st.innerHTML = `<b>#${formId}</b> kontrol ediliyor...`;
        await sleep(2000);
        
        // Yenile (Refresh) ve Başarıyı Kontrol Et
        ifr.src = url + "&check=1";
        await sleep(3000);
        
        var checkDoc = ifr.contentDocument || ifr.contentWindow.document;
        var checkBtn = Array.from(checkDoc.querySelectorAll('button')).find(b => b.innerText.includes('Onayla'));
        
        if (!checkBtn || checkDoc.body.innerText.includes('Onaylandı')) {
            st.innerHTML = `<b>#${formId}</b> Başarılı!`;
            if (row) {
                row.style.outline = '';
                row.style.backgroundColor = '#d4edda';
                var cb = row.querySelector('.w-cb');
                if (cb) { cb.checked = false; cb.disabled = true; }
            }
            selected.delete(url);
        } else {
            st.innerHTML = `<b>#${formId}</b> HATA: Sunucu onaylamadı!`;
            if (row) row.style.outline = '2px solid #dc3545';
        }
    }

    btnGo.onclick = async function() {
        if (selected.size === 0) return alert("Lütfen form seçin!");
        
        btnGo.disabled = true;
        var urls = Array.from(selected);
        for (var url of urls) {
            await processForm(url);
            await sleep(1500);
        }
        st.innerHTML = `<b>İşlemler tamamlandı!</b>`;
        btnGo.disabled = false;
    };
})();
