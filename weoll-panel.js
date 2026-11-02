(function() {
    if (document.getElementById('weoll-panel')) {
        alert('Panel zaten açık!');
        return;
    }

    // 1. OTURUM AÇAN KULLANICININ ADINI DİNAMİK OLARAK AL
    function getAktifKullaniciAdi() {
        var nameNode = document.querySelector('a.myspace-button div[style*="font-size: 14px"]');
        if (nameNode && nameNode.textContent.trim()) {
            return nameNode.textContent.trim();
        }
        var mySpace = document.querySelector('a.myspace-button');
        if (mySpace && mySpace.textContent.trim()) {
            var satirlar = mySpace.textContent.split('\n').map(s => s.trim()).filter(Boolean);
            if (satirlar.length > 0) return satirlar[0];
        }
        return null;
    }

    var aktifKullanici = getAktifKullaniciAdi();

    if (!aktifKullanici) {
        alert("Oturum açmış kullanıcı adı sol menüden tespit edilemedi. Lütfen sayfayı yenileyip tekrar deneyin.");
        return;
    }

    var run = false;
    var selectedTasks = new Map();

    // 2. PANEL ARAYÜZÜ
    var p = document.createElement('div');
    p.id = 'weoll-panel';
    p.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#fff;border:2px solid #004d71;border-radius:8px;padding:12px;width:300px;font-family:sans-serif;font-size:12px;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    p.innerHTML = `
        <div style="font-weight:bold;margin-bottom:6px;display:flex;justify-content:space-between;color:#004d71;">
            <span>Weoll Onay Kumandası</span>
            <span style="cursor:pointer;font-weight:bold;color:#888;" id="w-x">✖</span>
        </div>
        <div id="w-target" style="padding:6px;background:#f8f9fa;border-left:4px solid #004d71;margin-bottom:8px;font-size:12px;">
            <b id="w-count-text">0 form seçildi</b>
        </div>
        <div id="w-st" style="margin-bottom:8px;color:#555;font-size:11px;">Aktif Kullanıcı: <b>${aktifKullanici}</b></div>
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
    var ifr = document.getElementById('w-if');

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function updateCounter() {
        var total = document.querySelectorAll('a[href*="/forms/submission?id="]').length;
        countText.innerText = selectedTasks.size + ' / ' + total + ' form seçildi';
        var thCb = document.getElementById('w-th-cb');
        if (thCb) thCb.checked = (total > 0 && selectedTasks.size === total);
    }

    // Satırdaki gönderen ismiyle aktif kullanıcıyı karşılaştırır
    function isAyniKullanici(row) {
        var senderCard = row.querySelector('.user-card-v0') || row;
        return senderCard.textContent.toLocaleLowerCase('tr-TR').includes(aktifKullanici.toLocaleLowerCase('tr-TR'));
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
            var formId = link.innerText.trim();
            var ayniKullanici = isAyniKullanici(row);

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
                cb.checked = selectedTasks.has(url);

                cb.onchange = function() {
                    if (this.checked) {
                        selectedTasks.set(url, { formId: formId, ayniKullanici: ayniKullanici, row: row });
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
            var formId = link.innerText.trim();
            var ayniKullanici = isAyniKullanici(row);

            if (select) {
                selectedTasks.set(url, { formId: formId, ayniKullanici: ayniKullanici, row: row });
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

    // 4. İŞLEME VE KONTROL (REFRESH CHECK) MOTORU
    async function doOne(task) {
        var url = task[0];
        var info = task[1];
        var row = info.row;
        var formId = info.formId;
        var ayniKullanici = info.ayniKullanici;

        // Gönderen ile aktif oturum sahibi farklıysa işlem yapma, atla
        if (!ayniKullanici) {
            st.innerText = `⏭ #${formId} atlandı (Gönderen farklı).`;
            if (row) {
                row.style.outline = '1px dashed #6c757d';
                row.style.backgroundColor = '#f8f9fa';
                var cb = row.querySelector('.w-row-cb');
                if (cb) cb.checked = false;
            }
            selectedTasks.delete(url);
            updateCounter();
            await sleep(600);
            return true;
        }

        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.outline = '3px solid #ff9800';
            row.style.backgroundColor = '#fff3cd';
        }

        st.innerText = `Yükleniyor: #${formId}...`;
        ifr.src = url;

        await sleep(3500);

        var doc = ifr.contentDocument || ifr.contentWindow.document;
        var clickSuccess = false;

        for (var k = 0; k < 10; k++) {
            var rad = doc.querySelector('input[type="radio"][value="Evet"]');
            var buttons = Array.from(doc.querySelectorAll('button'));
            var btn = buttons.find(b => b.innerText.includes('Onayla')) || doc.querySelector('button.btn-success');

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
            await sleep(1000);
        }

        if (!clickSuccess) {
            st.innerText = `✖ #${formId} buton bulunamadı!`;
            if (row) {
                row.style.outline = '2px solid #dc3545';
                row.style.backgroundColor = '#f8d7da';
            }
            return false;
        }

        // Açılır onay penceresi (modal) varsa tıkla
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

        // 5. DOĞRULAMA (REFRESH İLE KONTROL)
        st.innerText = `Doğrulanıyor: #${formId}...`;
        await sleep(2000);

        ifr.src = url + '&check=' + Date.now();
        await sleep(3500);

        var checkDoc = ifr.contentDocument || ifr.contentWindow.document;
        var checkButtons = Array.from(checkDoc.querySelectorAll('button'));
        var checkBtn = checkButtons.find(b => b.innerText.includes('Onayla')) || checkDoc.querySelector('button.btn-success');
        
        var isApproved = !checkBtn || checkDoc.body.innerText.includes('Onaylandı') || checkDoc.body.innerText.includes('Onaylanan Süreç');

        if (isApproved) {
            st.innerText = `✔ #${formId} onaylandı ve doğrulandı!`;
            selectedTasks.delete(url);

            if (row) {
                row.style.outline = '2px solid #28a745';
                row.style.backgroundColor = '#d4edda';
                var cbDone = row.querySelector('.w-row-cb');
                if (cbDone) {
                    cbDone.checked = false;
                    cbDone.disabled = true;
                }
            }
            updateCounter();
            return true;
        } else {
            st.innerText = `✖ #${formId} sunucu onaylamadı!`;
            if (row) {
                row.style.outline = '2px solid #dc3545';
                row.style.backgroundColor = '#f8d7da';
            }
            return false;
        }
    }

    // 6. BUTON TETİKLEYİCİLERİ
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
        if (selectedTasks.size === 0) {
            alert('Lütfen önce onaylamak istediğiniz formları işaretleyin!');
            return;
        }
        if (run) return;
        run = true;

        var tasks = Array.from(selectedTasks.entries());
        for (var i = 0; i < tasks.length; i++) {
            if (!run) break;
            await doOne(tasks[i]);
            if (run) await sleep(1200);
        }

        run = false;
        st.innerText = 'Tüm işlemler tamamlandı!';
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
