(function() {
    if (document.getElementById('weoll-panel')) {
        alert('Panel zaten açık!');
        return;
    }

    var links = Array.from(document.querySelectorAll('a[href*="/forms/submission?id="]'));
    if (links.length === 0) {
        alert('Sayfada form linki bulunamadı! Lütfen "Bekleyen Cevaplarım" listesinde olduğunuzdan emin olun.');
        return;
    }

    var idx = 0;
    var run = false;

    // Kumanda Paneli Arayüzü
    var p = document.createElement('div');
    p.id = 'weoll-panel';
    p.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#fff;border:2px solid #004d71;border-radius:8px;padding:12px;width:290px;font-family:sans-serif;font-size:12px;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    p.innerHTML = `
        <div style="font-weight:bold;margin-bottom:6px;display:flex;justify-content:space-between;color:#004d71;">
            <span>Weoll Onay Kumandası</span>
            <span style="cursor:pointer;font-weight:bold;color:#888;" id="w-x">✖</span>
        </div>
        <div id="w-target" style="padding:6px;background:#f8f9fa;border-left:4px solid #ff9800;margin-bottom:8px;font-size:12px;">Hazırlanıyor...</div>
        <div id="w-st" style="margin-bottom:8px;color:#555;font-size:11px;">Toplam: ${links.length} form</div>
        <div style="display:flex;gap:4px;margin-bottom:8px;">
            <button id="w-btn-go" style="flex:1;background:#28a745;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Başlat</button>
            <button id="w-btn-step" style="flex:1.3;background:#0d6efd;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Bu Formu Onayla</button>
            <button id="w-btn-stop" style="flex:1;background:#dc3545;color:#fff;border:none;padding:7px;border-radius:4px;cursor:pointer;font-weight:bold;">Durdur</button>
        </div>
        <iframe id="w-if" style="width:100%;height:60px;border:1px dashed #ccc;border-radius:4px;"></iframe>
    `;
    document.body.appendChild(p);

    var st = document.getElementById('w-st');
    var targetBox = document.getElementById('w-target');
    var ifr = document.getElementById('w-if');

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Sıradaki satırı sarıya boyar, ekranda ortalar ve panelde gösterir
    function focusRow(i) {
        if (i >= links.length) {
            targetBox.innerHTML = '<b>Tüm liste bitti!</b>';
            targetBox.style.borderLeftColor = '#28a745';
            st.innerText = 'İşlemler tamamlandı.';
            return;
        }

        var link = links[i];
        var formId = link.innerText.trim() || 'Form';
        var row = link.closest('tr');

        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.outline = '3px solid #ff9800';
            row.style.backgroundColor = '#fff3cd';
            row.style.transition = 'all 0.3s';
        }

        targetBox.innerHTML = `👉 <b>Sıradaki: #${formId}</b> (${i + 1}/${links.length})`;
        targetBox.style.borderLeftColor = '#ff9800';
    }

    // Tek formu iframe içinde açıp onaylar
    async function doOne(i) {
        if (i >= links.length) return false;

        var link = links[i];
        var formId = link.innerText.trim();
        var row = link.closest('tr');

        st.innerText = `İşleniyor: #${formId}...`;
        ifr.src = link.href;

        await sleep(3000); // Sayfa yükleme beklemesi

        var doc = ifr.contentDocument || ifr.contentWindow.document;

        for (var k = 0; k < 10; k++) {
            var rad = doc.querySelector('input[type="radio"][value="Evet"]');
            var btn = doc.querySelector('button.btn-success');

            if (rad && btn) {
                rad.click();
                await sleep(400);
                btn.click();

                st.innerText = `✔ #${formId} onaylandı!`;
                if (row) {
                    row.style.outline = '2px solid #28a745';
                    row.style.backgroundColor = '#d4edda';
                }
                await sleep(1500);
                return true;
            }
            await sleep(1000);
        }

        st.innerText = `✖ #${formId} buton bulunamadı!`;
        if (row) {
            row.style.outline = '2px solid #dc3545';
            row.style.backgroundColor = '#f8d7da';
        }
        return false;
    }

    focusRow(idx);

    // Buton Tetikleyicileri
    document.getElementById('w-btn-go').onclick = async function() {
        if (run) return;
        run = true;
        while (idx < links.length && run) {
            focusRow(idx);
            await doOne(idx);
            idx++;
            if (run) {
                focusRow(idx);
                await sleep(1000);
            }
        }
        if (idx >= links.length) {
            run = false;
            focusRow(idx);
        }
    };

    document.getElementById('w-btn-step').onclick = async function() {
        if (idx < links.length) {
            await doOne(idx);
            idx++;
            focusRow(idx);
        } else {
            focusRow(idx);
        }
    };

    document.getElementById('w-btn-stop').onclick = function() {
        run = false;
        st.innerText = 'Durduruldu.';
    };

    document.getElementById('w-x').onclick = function() {
        run = false;
        links.forEach(l => {
            var r = l.closest('tr');
            if (r) {
                r.style.outline = '';
                r.style.backgroundColor = '';
            }
        });
        p.remove();
    };
})();
