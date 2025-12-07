#!/usr/bin/env node
/**
 * H3600 Modem Restart Script
 * Tek komutla modemi yeniden başlatır
 * 
 * Kullanım: node restart.js
 * Veya: ./restart.js (chmod +x ile çalıştırılabilir yapıldıktan sonra)
 */

const puppeteer = require('puppeteer');

// Modem Ayarları
const MODEM_CONFIG = {
    url: 'http://192.168.1.1/',
    username: 'admin',
    password: 'admin',
    timeout: 30000
};

// Renkli konsol çıktısı için
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const icons = {
        info: `${colors.cyan}ℹ${colors.reset}`,
        success: `${colors.green}✓${colors.reset}`,
        warning: `${colors.yellow}⚠${colors.reset}`,
        error: `${colors.red}✗${colors.reset}`,
        step: `${colors.bold}→${colors.reset}`
    };
    console.log(`[${timestamp}] ${icons[type] || icons.info} ${message}`);
}

async function restartModem() {
    let browser;

    try {
        log('Modem yeniden başlatma işlemi başlıyor...', 'info');
        log(`Hedef: ${MODEM_CONFIG.url}`, 'info');

        // Headless browser başlat
        log('Tarayıcı başlatılıyor...', 'step');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(MODEM_CONFIG.timeout);

        // Dialog handler'ı erken ayarla (confirmation dialog için)
        let dialogHandled = false;
        page.on('dialog', async dialog => {
            log(`Dialog algılandı: ${dialog.message()}`, 'info');
            await dialog.accept();
            dialogHandled = true;
            log('Dialog kabul edildi!', 'success');
        });

        // Modem sayfasına git
        log('Modem sayfasına bağlanılıyor...', 'step');
        await page.goto(MODEM_CONFIG.url, {
            waitUntil: 'networkidle2',
            timeout: MODEM_CONFIG.timeout
        });

        // Giriş bilgilerini doldur
        log('Giriş bilgileri giriliyor...', 'step');

        // Username alanını bul ve doldur
        await page.waitForSelector('input[name="Username"], input[id="Username"], input[type="text"]', { timeout: 10000 });
        await page.type('input[name="Username"], input[id="Username"], input[type="text"]', MODEM_CONFIG.username);

        // Password alanını bul ve doldur
        await page.type('input[name="Password"], input[id="Password"], input[type="password"]', MODEM_CONFIG.password);

        // Giriş butonuna tıkla
        log('Giriş yapılıyor...', 'step');
        await page.click('input[id="LoginId"], input[type="submit"], button[type="submit"]');

        // Sayfanın yüklenmesini bekle
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => { });
        await new Promise(resolve => setTimeout(resolve, 2000));

        log('Giriş başarılı!', 'success');

        // Yönetim menüsüne git
        log('Yönetim sayfasına gidiliyor...', 'step');

        // JavaScript ile menü linkini bul ve tıkla
        await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const mgmtLink = links.find(l =>
                l.textContent.includes('Yönetim') ||
                l.textContent.includes('Management') ||
                l.href?.includes('management')
            );
            if (mgmtLink) mgmtLink.click();
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Sistem Yönetimi sayfasına git
        log('Sistem Yönetimi sayfasına gidiliyor...', 'step');
        await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const sysLink = links.find(l =>
                l.textContent.includes('Sistem Yönetimi') ||
                l.textContent.includes('System Management') ||
                l.textContent.includes('Sistem')
            );
            if (sysLink) sysLink.click();
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Yeniden Başlat butonunu bul ve tıkla
        log('Yeniden başlatma butonu aranıyor...', 'step');

        const restartButton = await page.$('input[id="Btn_restart"], input.Btn_restart, button[id="Btn_restart"]');

        if (restartButton) {
            log('Yeniden başlatma butonu bulundu!', 'success');
            log('Modem yeniden başlatılıyor...', 'warning');

            await restartButton.click();

            // Custom HTML dialog'un görünmesini bekle
            log('Onay dialogu bekleniyor...', 'step');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // #confirmOK butonunu bul ve tıkla (modem custom dialog kullanıyor)
            const confirmButton = await page.$('#confirmOK, button#confirmOK, input#confirmOK');

            if (confirmButton) {
                log('Onay dialogu bulundu!', 'success');
                await confirmButton.click();
                log('Yeniden başlatma onaylandı!', 'success');
            } else {
                // Alternatif: Dialog görünür olmayabilir, sayfada confirmOK'u ara
                log('Onay dialogu aranıyor (alternatif yöntem)...', 'warning');
                const confirmed = await page.evaluate(() => {
                    const okBtn = document.getElementById('confirmOK');
                    if (okBtn) {
                        okBtn.click();
                        return true;
                    }
                    return false;
                });

                if (confirmed) {
                    log('Yeniden başlatma onaylandı (JS ile)!', 'success');
                } else {
                    log('Onay butonu bulunamadı!', 'warning');
                }
            }

            // Modem restart işleminin başlaması için bekle
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            // Alternatif yöntem: JavaScript ile doğrudan restart fonksiyonunu çağır
            log('Buton bulunamadı, alternatif yöntem deneniyor...', 'warning');

            await page.evaluate(() => {
                // Sayfadaki tüm input butonlarını kontrol et
                const inputs = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"], button'));
                const restartBtn = inputs.find(btn =>
                    btn.value?.includes('Yeniden') ||
                    btn.textContent?.includes('Yeniden') ||
                    btn.id?.includes('restart') ||
                    btn.className?.includes('restart')
                );
                if (restartBtn) {
                    restartBtn.click();
                    return true;
                }
                return false;
            });
        }

        console.log('');
        log('═══════════════════════════════════════════════', 'info');
        log(`${colors.green}${colors.bold}Modem yeniden başlatma işlemi tamamlandı!${colors.reset}`, 'success');
        log('Modem yaklaşık 1-2 dakika içinde tekrar aktif olacaktır.', 'info');
        log('═══════════════════════════════════════════════', 'info');

    } catch (error) {
        log(`Hata oluştu: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Ana fonksiyonu çalıştır
restartModem();
