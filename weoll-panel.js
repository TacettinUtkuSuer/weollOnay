(function() {
    if (document.getElementById('weoll-control-panel')) {
        alert("Panel zaten açık!");
        return;
    }

    // Listeden form bağlantılarını topla
    const formLinkleri = Array.from(document.querySelectorAll('a[href*="/forms/submission?id="]')).map(a => a.href);
    if (formLinkleri.length === 0) {
        alert("Sayfada bekleyen form linki bulunamadı!");
        return;
    }

    let currentIndex = 0;
    let isRunning = false;
    const bekle = ms => new Promise(r => setTimeout(r, ms));

    // Arayüz (HTML/CSS) Oluşturma
    const panel = document.createElement('div');
    panel.id = 'weoll-control-panel';
    panel.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 999999;
        background: #ffffff; border: 2px solid #004d71; border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2); padding: 15px; width: 280px;
        font-family: Arial, sans-serif; font-size: 13px; color: #333;
    `;

    panel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #004d71; display: flex; justify-content: space-between;">
            <span>Weoll Onay Paneli</span>
            <span style="cursor: pointer;" id="w-close">✖</span>
        </div>
        <div id="w-status" style="margin-bottom: 10px; color: #666;">Hazır (${formLinkleri.length} form bulundu)</div>
        <div style="display: flex; gap: 5px; margin-bottom: 10px;">
            <button id="w-start" style="flex: 1; padding: 6px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Başlat</button>
            <button id="w-step" style="flex: 1; padding: 6px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">Tek Onay</button>
            <button id="w-stop" style="flex: 1; padding: 6px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Durdur</button>
        </div>
        <iframe id="w-worker" style="width: 100%; height: 70px; border: 1px dashed #ccc; border-radius: 4px;"></iframe>
    `;
    document.body.appendChild(panel);

    const statusEl = document.getElementById('w-status');
    const iframe = document.getElementById('w-worker');

    async function onaylaTekForm(url) {
        statusEl.innerText = `Yükleniyor: ${currentIndex + 1}/${formLinkleri.length}`;
        iframe.src = url;
        await bekle(3000); // Sayfa yükleme beklemesi

        const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
        for (let j = 0; j < 8; j++) {
            const evetRadio = frameDoc.querySelector('input[type="radio"][value="Evet"]');
            const onaylaBtn = frameDoc.querySelector('button.btn-success');

            if (evetRadio && onaylaBtn) {
                evetRadio.click();
                await bekle(400);
                onaylaBtn.click();
                statusEl.innerText = `Onaylandı (${currentIndex + 1}/${formLinkleri.length})`;
                await bekle(1500);
                return true;
            }
            await bekle(1000);
        }
        statusEl.innerText = `Hata/Buton Yok: (${currentIndex + 1})`;
        return false;
    }

    // Buton Eylemleri
    document.getElementById('w-start').onclick = async () => {
        if (isRunning) return;
        isRunning = true;
        while (currentIndex < formLinkleri.length && isRunning) {
            await onaylaTekForm(formLinkleri[currentIndex]);
            currentIndex++;
            if (isRunning) await bekle(1000);
        }
        if (currentIndex >= formLinkleri.length) {
            statusEl.innerText = "Tüm liste tamamlandı!";
            isRunning = false;
        }
    };

    document.getElementById('w-step').onclick = async () => {
        if (currentIndex < formLinkleri.length) {
            await onaylaTekForm(formLinkleri[currentIndex]);
            currentIndex++;
        } else {
            statusEl.innerText = "Liste bitti!";
        }
    };

    document.getElementById('w-stop').onclick = () => {
        isRunning = false;
        statusEl.innerText = "Durduruldu.";
    };

    document.getElementById('w-close').onclick = () => {
        isRunning = false;
        panel.remove();
    };
})();
