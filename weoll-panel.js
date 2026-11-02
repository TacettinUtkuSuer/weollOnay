(function() {
    if (document.getElementById('weoll-panel')) {
        alert('Panel zaten açık!');
        return;
    }

    var run = false;
    var selectedUrls = new Set();

    // Giriş yapmış kullanıcının adını sol menüden dinamik al
    var myNameEl = document.querySelector('a.myspace-button [style*="font-size: 14px"]');
    var myName = myNameEl ? myNameEl.innerText.trim() : "Tacettin Utku SÜER";

    // Panel Arayüzü (Geniş ve Canlı İzlenebilir)
    var p = document.createElement('div');
    p.id = 'weoll-panel';
    p.style.cssText = 'position:fixed;bottom:15px;right:15px;z-index:999999;background:#fff;border:2px solid #004d71;border-radius:8px;padding:12px;width:520px;font-family:sans-serif;font-size:12px;box-shadow:0 6px 25px rgba(0,0,0,0.35);';
    p.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;display:flex;justify-content:space-between;color:#004d71;">
            <span>Weoll Canlı Onay Kumandası</span>
            <span style="cursor:pointer;font-weight:bold;color:#888;font-size:14px;" id="w-x">✖</span>
        </div>
        <div id="w-target" style="padding:6px;background:#f8f9fa;border-left:4px solid #004d71;margin-bottom:8px;font-size:12px;">
            <b id="w-count-text">0 form seçildi</b>
        </div>
        <div id="w-st" style="margin-bottom:8px;color:#555;font-size:11px;">Kullanıcı: ${myName}</div>
        <div style="display:flex;gap:6px;margin-bottom:10px;">
            <button id="w-btn-select-all" style="flex:1;background:#6c757d;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Tümünü Seç</button>
            <button id="w-btn-go" style="flex:1.5;background:#28a745;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Seçilenleri Onayla</button>
            <button id="w-btn-stop" style="flex:0.8;background:#dc3545;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Durdur</button>
        </div>
        <!-- Gerçek masaüstü çözünürlüğünde çalışan izleme penceresi -->
        <iframe id="w-if" style="width:100%;height:380px;border:1px solid #ced4da;border-radius:4px;background:#fafafa;"></iframe>
    `;
    document.body.appendChild(p);

    var st = document.getElementById('w-st');
    var countText = document.getElementById('w-count-text');
    var ifr = document.getElementById('w-if');

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getAllFormLinks() {
        return Array.from(document.querySelectorAll('a[href*="/forms/submission?id="]'));
    }

    function updateCounter() {
        var total = getAllFormLinks().length;
        countText.innerText = selectedUrls.size + ' / ' + total + ' form seçildi';
        var thCb = document.getElementById('w-th-cb');
        if (thCb) thCb.checked = (total > 0 && selectedUrls.size === total);
    }

    // Tabloya kutucukları ekle
    function attachCheckboxes() {
        var th = document.querySelector('th.row-icon-table');
        if (th && !document.getElementById('w-th-cb')) {
            th.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;"><input type="checkbox" id="w-th-cb" title="Tümünü Seç" style="cursor:pointer;width:16px;height:16px;"></div>';
            document.getElementById('w-th-cb').onchange = function() {
                toggleSelectAll(this.checked);
            };
        }

        var rows = document.querySelectorAll('tr[data-index]');
        rows.forEach(function(row) {
            var link = row.querySelector('a[href*="/forms/submission?id="]');
            var iconTd = row.querySelector('td.row-icon-table');
            if (!link || !iconTd) return;

            var url = link.href;

            if (!iconTd.querySelector('.w-row-cb')) {
                var origIcon = iconTd.querySelector('div');
                if (origIcon) origIcon.style.display = 'none';

                var cbWrapper = document.createElement('div');
                cbWrapper.style.cssText = 'display:flex;justify-content:center;align-items:center;height:100%;width:100%;';
                
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'w-row-cb';
                cb.dataset.url = url;
                cb.style.cssText = 'cursor:pointer;width:16px;height:16px;margin:0;';
                cb.checked = selectedUrls.has(url);

                cb.onchange = function() {
                    if (this.checked) {
                        selectedUrls.add(url);
                        row.style.backgroundColor = '#e8f4fd';
                    } else {
                        selectedUrls.delete(url);
                        row.style.backgroundColor = '';
                    }
                    updateCounter();
                };

                cbWrapper.appendChild(cb);
                iconTd.appendChild(cbWrapper);

                if (selectedUrls.has(url)) row.style.backgroundColor = '#e8f4fd';
            }
        });
        updateCounter();
    }

    function toggleSelectAll(select) {
        getAllFormLinks().forEach(function(link) {
            var url = link.href;
            var row = link.closest('tr');
            var cb = row ? row.querySelector('.w-row-cb') : null;

            if (select) {
                selectedUrls.add(url);
                if (cb) cb.checked = true;
                if (row) row.style.backgroundColor = '#e8f4fd';
            } else {
                selectedUrls.delete(url);
                if (cb) cb.checked = false;
                if (row) row.style.backgroundColor = '';
            }
        });
        updateCounter();
    }

    var tableBody = document.querySelector('#portal-table tbody');
    if (tableBody) {
        var observer = new MutationObserver(attachCheckboxes);
        observer.observe(tableBody, { childList: true });
    }
    attachCheckboxes();

    // Formu İşleme Motoru
    async function doOne(url) {
        var link = getAllFormLinks().find(a => a.href === url);
        var formId = link ? link.innerText.trim() : 'Form';
        var row = link ? link.closest('tr') : null;

        var isTacettin = false;
        if (row && row.innerText.toLowerCase().includes(myName.toLowerCase())) {
            isTacettin = true;
        }

        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.outline = '3px solid #ff9800';
            row.style.backgroundColor = '#fff3cd';
        }

        var islemTipi = isTacettin ? "(Evet + Onay)" : "(Sadece Onay)";
        st.innerText = `Sayfa yükleniyor: #${formId} ${islemTipi}...`;
        ifr.src = url;

        // Sayfanın ve Formio'nun tam render edilmesi için bekle
        await sleep(3500);

        var doc = ifr.contentDocument || ifr.contentWindow.document;

        // Tarayıcı alert/confirm pencerelerini engelleme
        try {
            if (ifr.contentWindow) {
                ifr.contentWindow.confirm = () => true;
                ifr.contentWindow.alert = () => true;
            }
        } catch(e) {}

        for (var k = 0; k < 12; k++) {
            var buttons = Array.from(doc.querySelectorAll('button'));
            var btn = buttons.find(b => b.innerText.includes('Onayla')) || doc.querySelector('button.btn-success');

            if (isTacettin) {
                var rad = doc.querySelector('input[type="radio"][value="Evet"]');
                if (rad && btn) {
                    st.innerText = `Form dolduruluyor: #${formId}...`;
                    
                    // Görünür kıl ve tıkla
                    rad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    var lbl = doc.querySelector(`label[for="${rad.id}"]`) || rad.closest('label') || rad.parentElement;
                    if (lbl) lbl.click();
                    rad.click();
                    rad.checked = true;
                    rad.dispatchEvent(new Event('input', { bubbles: true }));
                    rad.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    await sleep(1000); // Formio durumunu güncellesin

                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btn.click();
                    break;
                }
            } else {
                if (btn) {
                    st.innerText = `Onaylanıyor: #${formId}...`;
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btn.click();
                    break;
                }
            }
            await sleep(1000);
        }

        // Açılır onay pop-up'ı (Modal) kontrolü
        await sleep(1200);
        var modalBtn = doc.querySelector('.confirmation-modal__actions button.btn-success, .confirmation-modal__actions button.btn-primary, .modal-dialog button.btn-success, .modal-dialog button.btn-primary');
        if (!modalBtn) {
            var modals = doc.querySelectorAll('.modal.show, .confirmation-modal, .swal2-container, .formio-dialog');
            modals.forEach(m => {
                var mBtns = Array.from(m.querySelectorAll('button'));
                var confirmB = mBtns.find(b => b.innerText.includes('Evet') || b.innerText.includes('Onayla') || b.innerText.includes('Tamam'));
                if (confirmB) modalBtn = confirmB;
            });
        }

        if (modalBtn) {
            st.innerText = `Açılır pencere onaylanıyor: #${formId}...`;
            modalBtn.click();
            await sleep(2000);
        } else {
            // Modal yoksa sunucunun isteği işlemesi için bekle
            await sleep(2000);
        }

        st.innerText = `✔ #${formId} tamamlandı!`;
        selectedUrls.delete(url);

        if (row) {
            row.style.outline = '2px solid #28a745';
            row.style.backgroundColor = '#d4edda';
            var cb = row.querySelector('.w-row-cb');
            if (cb) {
                cb.checked = false;
                cb.disabled = true;
            }
        }
        updateCounter();
        return true;
    }

    // Buton Tetikleyicileri
    document.getElementById('w-btn-select-all').onclick = function() {
        var total = getAllFormLinks().length;
        if (selectedUrls.size === total) {
            toggleSelectAll(false);
            this.innerText = 'Tümünü Seç';
        } else {
            toggleSelectAll(true);
            this.innerText = 'Seçimi Kaldır';
        }
    };

    document.getElementById('w-btn-go').onclick = async function() {
        if (selectedUrls.size === 0) {
            alert('Lütfen önce onaylamak istediğiniz formları işaretleyin!');
            return;
        }
        if (run) return;
        run = true;

        var toProcess = Array.from(selectedUrls);
        for (var i = 0; i < toProcess.length; i++) {
            if (!run) break;
            await doOne(toProcess[i]);
            if (run) await sleep(1500);
        }

        run = false;
        st.innerText = 'Seçilen tüm işlemler bitti!';
    };

    document.getElementById('w-btn-stop').onclick = function() {
        run = false;
        st.innerText = 'Durduruldu.';
    };

    document.getElementById('w-x').onclick = function() {
        run = false;
        if (observer) observer.disconnect();
        document.querySelectorAll('tr[data-index]').forEach(r => {
            r.style.outline = '';
            r.style.backgroundColor = '';
            var orig = r.querySelector('td.row-icon-table div');
            if (orig) orig.style.display = '';
            var cbW = r.querySelector('.w-row-cb');
            if (cbW && cbW.parentElement) cbW.parentElement.remove();
        });
        p.remove();
    };
})();
