(function() {
    if (document.getElementById('weoll-panel')) {
        return; 
    }

    var run = false;
    var selectedTasks = new Map();
    var isSystemReady = false; // Sistem (İsim + Gönderen sütunu) hazır mı?

    // 1. SOL MENÜDEN CANLI İSİM OKUMA
    function getAktifKullaniciAdi() {
        var mySpace = document.querySelector('a.myspace-button');
        if (!mySpace || mySpace.offsetWidth === 0) return null;
        
        var nameNode = mySpace.querySelector('div[style*="font-size: 14px"]');
        if (nameNode && nameNode.textContent.trim()) {
            return nameNode.textContent.trim();
        }
        if (mySpace.textContent.trim()) {
            var satirlar = mySpace.textContent.split('\n').map(s => s.trim()).filter(Boolean);
            if (satirlar.length > 0) return satirlar[0];
        }
        return null;
    }

    // GÖNDEREN SÜTUNU GÖRÜNÜYOR MU?
    function isGonderenVisible() {
        var ths = Array.from(document.querySelectorAll('th'));
        var gonderenTh = ths.find(th => th.innerText.includes('Gönderen'));
        // Sütun başlığı yoksa veya offsetWidth 0 (ekranda gizlenmişse) false döner
        if (!gonderenTh || gonderenTh.offsetWidth === 0) return false;
        return true;
    }

    // 2. PANEL ARAYÜZÜ
    var p = document.createElement('div');
    p.id = 'weoll-panel';
    p.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#fff;border:2px solid #004d71;border-radius:8px;padding:12px;width:310px;font-family:sans-serif;font-size:12px;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    p.innerHTML = `
        <div style="font-weight:bold;margin-bottom:6px;display:flex;justify-content:space-between;color:#004d71;">
            <span>Weoll Dinamik Onay Paneli</span>
            <span style="cursor:pointer;font-weight:bold;color:#888;" id="w-x">✖</span>
        </div>
        <div id="w-user-info" style="margin-bottom:6px;padding:6px;border-radius:4px;font-size:11px;background:#e8f4fd;color:#004d71;border-left:4px solid #0d6efd;">
            Ekran kontrol ediliyor...
        </div>
        <div id="w-target" style="padding:6px;background:#f8f9fa;border-left:4px solid #6c757d;margin-bottom:8px;font-size:12px;">
            <b id="w-count-text">0 form seçildi</b>
        </div>
        <div id="w-st" style="margin-bottom:8px;color:#555;font-size:11px;">Hazır. Onaylamak istediklerinizi seçin.</div>
        <div style="display:flex;gap:4px;margin-bottom:8px;">
            <button id="w-btn-select-all" style="flex:1;background:#6c757d;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Tümünü Seç</button>
            <button id="w-btn-go" style="flex:1.4;background:#28a745;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Seçilenleri Onayla</button>
            <button id="w-btn-stop" style="flex:0.8;background:#dc3545;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Durdur</button>
        </div>
        <iframe id="w-if" style="width:100%;height:80px;border:1px dashed #ccc;border-radius:4px;background:#fafafa;"></iframe>
    `;
    document.body.appendChild(p);

    var st = document.getElementById('w-st');
    var countText = document.getElementById('w-count-text');
    var userInfo = document.getElementById('w-user-info');
    var ifr = document.getElementById('w-if');
    var aktifKullanici = null;

    // CANLI RADAR: Her 1 saniyede sol menüyü VE gönderen sütununu kontrol eder
    var userCheckInterval = setInterval(() => {
        aktifKullanici = getAktifKullaniciAdi();
        var gonderenGorunur = isGonderenVisible();

        if (!aktifKullanici) {
            userInfo.innerHTML = `⚠️ Sol menü kapalı! İsim okunamıyor.`;
            setRadarError();
        } else if (!gonderenGorunur) {
            userInfo.innerHTML = `⚠️ "Gönderen" sütunu gizli! Ekranı uzaklaştırın.`;
            setRadarError();
        } else {
            userInfo.innerHTML = `Kullanıcı: <b>${aktifKullanici}</b> (Sistem Hazır)`;
            userInfo.style.background = '#e8f4fd';
            userInfo.style.borderLeftColor = '#0d6efd';
            userInfo.style.color = '#004d71';
            isSystemReady = true;
        }
    }, 1000);

    function setRadarError() {
        userInfo.style.background = '#f8d7da';
        userInfo.style.borderLeftColor = '#dc3545';
        userInfo.style.color = '#dc3545';
        isSystemReady = false;
        run = false; // Hata anında işlemi durdur
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function updateCounter() {
        var total = document.querySelectorAll('a[href*="/forms/submission?id="]').length;
        countText.innerText = selectedTasks.size + ' / ' + total + ' form seçildi';
        var thCb = document.getElementById('w-th-cb');
        if (thCb) thCb.checked = (total > 0 && selectedTasks.size === total);
    }

    // 3. TABLOYA CHECKBOX YERLEŞTİRME
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
                cb.style.cssText = 'cursor:pointer;width:16px;height:16px;margin:0;';
                cb.checked = selectedTasks.has(url);

                cb.onchange = function() {
                    if (this.checked) {
                        selectedTasks.set(url, url);
                        row.style.backgroundColor = '#e8f4fd';
                    } else {
                        selectedTasks.delete(url);
                        row.style.backgroundColor = '';
                    }
                    updateCounter();
                };

                cbWrapper.appendChild(cb);
                iconTd.appendChild(cbWrapper);

                if (selectedTasks.has(url)) row.style.backgroundColor = '#e8f4fd';
            }
        });
        updateCounter();
    }

    function toggleSelectAll(select) {
        var rows = document.querySelectorAll('tr[data-index]');
        rows.forEach(function(row) {
            var link = row.querySelector('a[href*="/forms/submission?id="]');
            var cb = row.querySelector('.w-row-cb');
            if (!link) return;
            var url = link.href;

            if (select) {
                selectedTasks.set(url, url);
                if (cb) cb.checked = true;
                row.style.backgroundColor = '#e8f4fd';
            } else {
                selectedTasks.delete(url);
                if (cb) cb.checked = false;
                row.style.backgroundColor = '';
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

    // 4. İŞLEME VE DİNAMİK LİSTE KONTROLÜ
    async function doOne(url) {
        if (!isSystemReady) {
            st.innerText = "HATA: Ekran uygun değil! İşlem durduruldu.";
            run = false;
            return false;
        }

        var link = document.querySelector(`a[href="${url}"]`);
        var formId = link ? link.innerText.trim() : 'Form';
        var row = link ? link.closest('tr') : null;

        if (!row) return false;

        // Karar anında gönderen sütunundan ismi oku
        var senderCard = row.querySelector('.user-card-v0');
        var isSameUser = senderCard ? senderCard.textContent.toLocaleLowerCase('tr-TR').includes(aktifKullanici.toLocaleLowerCase('tr-TR')) : false;

        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.outline = '3px solid #ff9800';
        row.style.backgroundColor = '#fff3cd';

        st.innerText = `Yükleniyor: #${formId}...`;
        ifr.src = url;

        await sleep(3500);
        var doc = ifr.contentDocument || ifr.contentWindow.document;
        var clickSuccess = false;

        for (var k = 0; k < 10; k++) {
            var rad = doc.querySelector('input[type="radio"][value="Evet"]');
            var buttons = Array.from(doc.querySelectorAll('button'));
            var btn = buttons.find(b => b.innerText.includes('Onayla')) || doc.querySelector('button.btn-success');

            if (isSameUser) {
                if (rad && btn) {
                    st.innerText = `Evet seçiliyor: #${formId}...`;
                    var lbl = doc.querySelector(`label[for="${rad.id}"]`) || rad.parentElement;
                    if (lbl) lbl.click();
                    rad.click();
                    rad.checked = true;
                    rad.dispatchEvent(new Event('input', { bubbles: true }));
                    rad.dispatchEvent(new Event('change', { bubbles: true }));

                    await sleep(800);
                    btn.click();
                    clickSuccess = true;
                    break;
                }
            } else {
                if (btn) {
                    st.innerText = `Onaylanıyor: #${formId}...`;
                    btn.click();
                    clickSuccess = true;
                    break;
                }
            }
            await sleep(1000);
        }

        if (!clickSuccess) {
            st.innerText = `✖ #${formId} buton bulunamadı!`;
            row.style.outline = '2px solid #dc3545';
            row.style.backgroundColor = '#f8d7da';
            return false;
        }

        // Modal Onayı
        await sleep(1000);
        var modalBtn = doc.querySelector('.confirmation-modal__actions button.btn-success, .modal-dialog button.btn-success, .modal-dialog button.btn-primary');
        if (!modalBtn) {
            var modals = doc.querySelectorAll('.modal.show, .confirmation-modal');
            modals.forEach(m => {
                var mBtns = Array.from(m.querySelectorAll('button'));
                var confirmB = mBtns.find(b => b.innerText.includes('Evet') || b.innerText.includes('Onayla'));
                if (confirmB) modalBtn = confirmB;
            });
        }
        if (modalBtn) modalBtn.click();

        // REFRESH CHECK DOĞRULAMASI
        st.innerText = `Doğrulanıyor: #${formId}...`;
        await sleep(2000);

        ifr.src = url + '&check=' + Date.now();
        await sleep(3500);

        var checkDoc = ifr.contentDocument || ifr.contentWindow.document;
        var checkButtons = Array.from(checkDoc.querySelectorAll('button'));
        var checkBtn = checkButtons.find(b => b.innerText.includes('Onayla')) || checkDoc.querySelector('button.btn-success');
        var isApproved = !checkBtn || checkDoc.body.innerText.includes('Onaylandı') || checkDoc.body.innerText.includes('Onaylanan Süreç');

        if (isApproved) {
            st.innerText = `✔ #${formId} onaylandı!`;
            selectedTasks.delete(url);
            row.style.outline = '2px solid #28a745';
            row.style.backgroundColor = '#d4edda';
            var cbDone = row.querySelector('.w-row-cb');
            if (cbDone) {
                cbDone.checked = false;
                cbDone.disabled = true;
            }
            updateCounter();
            return true;
        } else {
            st.innerText = `✖ #${formId} sunucu onaylamadı!`;
            row.style.outline = '2px solid #dc3545';
            row.style.backgroundColor = '#f8d7da';
            return false;
        }
    }

    // 5. BUTON TETİKLEYİCİLERİ
    document.getElementById('w-btn-select-all').onclick = function() {
        var total = document.querySelectorAll('a[href*="/forms/submission?id="]').length;
        if (selectedTasks.size === total) {
            toggleSelectAll(false);
            this.innerText = 'Tümünü Seç';
        } else {
            toggleSelectAll(true);
            this.innerText = 'Seçimi Kaldır';
        }
    };

    document.getElementById('w-btn-go').onclick = async function() {
        if (!isSystemReady) {
            alert("Sistem hazır değil! Lütfen ekran uyarılarını düzeltin.");
            return;
        }
        if (selectedTasks.size === 0) {
            st.innerText = 'Lütfen onaylanacak formları seçin!';
            return;
        }
        if (run) return;
        run = true;

        var tasks = Array.from(selectedTasks.keys());
        for (var i = 0; i < tasks.length; i++) {
            if (!run || !isSystemReady) break;
            await doOne(tasks[i]);
            if (run) await sleep(1200);
        }

        run = false;
        if (selectedTasks.size === 0) {
            st.innerText = 'Tüm işlemler tamamlandı!';
        }
    };

    document.getElementById('w-btn-stop').onclick = function() {
        run = false;
        st.innerText = 'Durduruldu.';
    };

    document.getElementById('w-x').onclick = function() {
        run = false;
        clearInterval(userCheckInterval);
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
