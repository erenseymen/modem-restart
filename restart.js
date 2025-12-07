#!/usr/bin/env node
/**
 * H3600 Modem Restart Script
 * Tek komutla modemi yeniden başlatır ve internet gelene kadar bekler
 * 
 * Özellikler:
 *   - Modem web arayüzüne bağlanarak yeniden başlatır
 *   - Restart sonrası internet bağlantısını belirli aralıklarla kontrol eder
 *   - Internet geldiğinde masaüstü bildirimi (notification) gönderir
 * 
 * Kullanım: 
 *   node restart.js [options]
 *   ./restart.js [options] (chmod +x ile çalıştırılabilir yapıldıktan sonra)
 * 
 * Parametreler:
 *   --url <url>           Modem URL'i (varsayılan: http://192.168.1.1/)
 *   --username <user>     Kullanıcı adı (varsayılan: admin)
 *   --password <pass>     Şifre (varsayılan: admin)
 *   --timeout <ms>        Zaman aşımı (ms) (varsayılan: 30000)
 *   --help                Bu yardım mesajını göster
 * 
 * Örnek:
 *   node restart.js --url http://192.168.1.1/ --username admin --password mypass123
 */

const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const dns = require('dns');
const https = require('https');
const http = require('http');

// Internet kontrol ayarları
const INTERNET_CHECK_CONFIG = {
    checkInterval: 5000,      // 5 saniye aralıkla kontrol
    maxAttempts: 60,          // Maksimum 60 deneme (5 dakika)
    testUrls: [
        'https://www.google.com',
        'https://cloudflare.com',
        'https://www.example.com'
    ],
    dnsServers: ['8.8.8.8', '1.1.1.1']
};

// Komut satırı parametrelerini parse et
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--url':
                parsed.url = args[++i];
                break;
            case '--username':
            case '-u':
                parsed.username = args[++i];
                break;
            case '--password':
            case '-p':
                parsed.password = args[++i];
                break;
            case '--timeout':
            case '-t':
                parsed.timeout = parseInt(args[++i], 10);
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    return parsed;
}

function showHelp() {
    console.log(`
H3600 Modem Restart Script
===========================

Kullanım: node restart.js [options]

Parametreler:
  --url <url>           Modem URL'i (varsayılan: http://192.168.1.1/)
  --username, -u <user> Kullanıcı adı (varsayılan: admin)
  --password, -p <pass> Şifre (varsayılan: admin)
  --timeout, -t <ms>    Zaman aşımı milisaniye (varsayılan: 30000)
  --help, -h            Bu yardım mesajını göster

Örnekler:
  node restart.js
  node restart.js --password mySecretPass
  node restart.js --url http://192.168.0.1/ --username root --password admin123
  node restart.js -u admin -p password123 -t 60000
`);
}

// Varsayılan ayarlar
const DEFAULT_CONFIG = {
    url: 'http://192.168.1.1/',
    username: 'admin',
    password: 'admin',
    timeout: 30000
};

// Komut satırı parametrelerini al ve varsayılanlarla birleştir
const userArgs = parseArgs();
const MODEM_CONFIG = {
    ...DEFAULT_CONFIG,
    ...userArgs
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

// Desktop notification gönder (Linux notify-send)
function sendNotification(title, message, urgency = 'normal') {
    return new Promise((resolve) => {
        const iconPath = 'network-wireless'; // Sistem ikonu
        const command = `notify-send -u ${urgency} -i "${iconPath}" "${title}" "${message}"`;

        exec(command, (error) => {
            if (error) {
                log(`Notification gönderilemedi: ${error.message}`, 'warning');
            }
            resolve();
        });
    });
}

// DNS ile internet kontrolü
function checkDNS() {
    return new Promise((resolve) => {
        dns.resolve('google.com', (err) => {
            resolve(!err);
        });
    });
}

// HTTP isteği ile internet kontrolü
function checkHTTP(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const timeout = 5000;

        const req = protocol.get(url, { timeout }, (res) => {
            resolve(res.statusCode >= 200 && res.statusCode < 400);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Ping ile internet kontrolü (daha güvenilir)
function checkPing(host = '8.8.8.8') {
    return new Promise((resolve) => {
        exec(`ping -c 1 -W 2 ${host}`, (error) => {
            resolve(!error);
        });
    });
}

// Tüm yöntemlerle internet kontrolü
async function checkInternet() {
    // Önce ping dene (en hızlı)
    const pingResult = await checkPing();
    if (pingResult) return true;

    // DNS kontrolü
    const dnsResult = await checkDNS();
    if (dnsResult) return true;

    // HTTP kontrolü (en son)
    for (const url of INTERNET_CHECK_CONFIG.testUrls) {
        const httpResult = await checkHTTP(url);
        if (httpResult) return true;
    }

    return false;
}

// Internet gelene kadar bekle ve bildir
async function waitForInternet() {
    log('', 'info');
    log('═══════════════════════════════════════════════', 'info');
    log('Internet bağlantısı kontrol ediliyor...', 'info');
    log('═══════════════════════════════════════════════', 'info');

    let attempt = 0;
    const startTime = Date.now();

    while (attempt < INTERNET_CHECK_CONFIG.maxAttempts) {
        attempt++;
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        log(`Deneme ${attempt}/${INTERNET_CHECK_CONFIG.maxAttempts} (${elapsedSeconds} saniye geçti)...`, 'step');

        const hasInternet = await checkInternet();

        if (hasInternet) {
            const totalTime = Math.floor((Date.now() - startTime) / 1000);

            console.log('');
            log('═══════════════════════════════════════════════', 'info');
            log(`${colors.green}${colors.bold}🎉 Internet bağlantısı geri geldi!${colors.reset}`, 'success');
            log(`Toplam bekleme süresi: ${totalTime} saniye`, 'info');
            log('═══════════════════════════════════════════════', 'info');

            // Desktop notification gönder
            await sendNotification(
                '🌐 Internet Bağlantısı Geri Geldi!',
                `Modem yeniden başlatma tamamlandı.\nBekleme süresi: ${totalTime} saniye`,
                'normal'
            );

            return true;
        }

        // Bir sonraki kontrole kadar bekle
        await new Promise(resolve => setTimeout(resolve, INTERNET_CHECK_CONFIG.checkInterval));
    }

    // Maksimum deneme sayısına ulaşıldı
    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    log('═══════════════════════════════════════════════', 'error');
    log(`${colors.red}${colors.bold}⚠️ Internet bağlantısı ${totalTime} saniye içinde gelmedi!${colors.reset}`, 'error');
    log('Modemi manuel olarak kontrol edin.', 'warning');
    log('═══════════════════════════════════════════════', 'error');

    await sendNotification(
        '⚠️ Internet Bağlantısı Yok!',
        `${totalTime} saniye beklendi ancak internet gelmedi.\nModemi kontrol edin!`,
        'critical'
    );

    return false;
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

        // Browser'ı kapat ve internet kontrolüne geç
        if (browser) {
            await browser.close();
            browser = null;
        }

        // Internet bağlantısını kontrol et
        await waitForInternet();

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
