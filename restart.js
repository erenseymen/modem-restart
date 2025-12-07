#!/usr/bin/env node
/**
 * H3600 Modem Restart Script
 * Restarts the modem with a single command and waits until internet is restored
 * 
 * Features:
 *   - Restarts modem via web interface
 *   - Checks internet connection at regular intervals after restart
 *   - Sends desktop notification when internet is restored
 * 
 * Usage: 
 *   node restart.js [options]
 *   ./restart.js [options] (after making executable with chmod +x)
 * 
 * Options:
 *   --url <url>           Modem URL (default: http://192.168.1.1/)
 *   --username <user>     Username (default: admin)
 *   --password <pass>     Password (default: admin)
 *   --timeout <ms>        Timeout in ms (default: 30000)
 *   --help                Show this help message
 * 
 * Example:
 *   node restart.js --url http://192.168.1.1/ --username admin --password mypass123
 */

const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const dns = require('dns');
const https = require('https');
const http = require('http');

// Internet check settings
const INTERNET_CHECK_CONFIG = {
    checkInterval: 5000,      // Check every 5 seconds
    maxAttempts: 60,          // Maximum 60 attempts (5 minutes)
    testUrls: [
        'https://www.google.com',
        'https://cloudflare.com',
        'https://www.example.com'
    ],
    dnsServers: ['8.8.8.8', '1.1.1.1']
};

// Parse command line arguments
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

Usage: node restart.js [options]

Options:
  --url <url>           Modem URL (default: http://192.168.1.1/)
  --username, -u <user> Username (default: admin)
  --password, -p <pass> Password (default: admin)
  --timeout, -t <ms>    Timeout in milliseconds (default: 30000)
  --help, -h            Show this help message

Examples:
  node restart.js
  node restart.js --password mySecretPass
  node restart.js --url http://192.168.0.1/ --username root --password admin123
  node restart.js -u admin -p password123 -t 60000
`);
}

// Default settings
const DEFAULT_CONFIG = {
    url: 'http://192.168.1.1/',
    username: 'admin',
    password: 'admin',
    timeout: 30000
};

// Get command line arguments and merge with defaults
const userArgs = parseArgs();
const MODEM_CONFIG = {
    ...DEFAULT_CONFIG,
    ...userArgs
};

// For colored console output
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

// Send desktop notification (Linux notify-send)
function sendNotification(title, message, urgency = 'normal') {
    return new Promise((resolve) => {
        const iconPath = 'network-wireless'; // Sistem ikonu
        const command = `notify-send -u ${urgency} -i "${iconPath}" "${title}" "${message}"`;

        exec(command, (error) => {
            if (error) {
                log(`Failed to send notification: ${error.message}`, 'warning');
            }
            resolve();
        });
    });
}

// Check internet via DNS
function checkDNS() {
    return new Promise((resolve) => {
        dns.resolve('google.com', (err) => {
            resolve(!err);
        });
    });
}

// Check internet via HTTP request
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

// Check internet via ping (more reliable)
function checkPing(host = '8.8.8.8') {
    return new Promise((resolve) => {
        exec(`ping -c 1 -W 2 ${host}`, (error) => {
            resolve(!error);
        });
    });
}

// Check internet using all methods
async function checkInternet() {
    // Try ping first (fastest)
    const pingResult = await checkPing();
    if (pingResult) return true;

    // DNS check
    const dnsResult = await checkDNS();
    if (dnsResult) return true;

    // HTTP check (last resort)
    for (const url of INTERNET_CHECK_CONFIG.testUrls) {
        const httpResult = await checkHTTP(url);
        if (httpResult) return true;
    }

    return false;
}

// Wait for internet and notify
async function waitForInternet() {
    log('', 'info');
    log('═══════════════════════════════════════════════', 'info');
    log('Checking internet connection...', 'info');
    log('═══════════════════════════════════════════════', 'info');

    let attempt = 0;
    const startTime = Date.now();

    while (attempt < INTERNET_CHECK_CONFIG.maxAttempts) {
        attempt++;
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        log(`Attempt ${attempt}/${INTERNET_CHECK_CONFIG.maxAttempts} (${elapsedSeconds} seconds elapsed)...`, 'step');

        const hasInternet = await checkInternet();

        if (hasInternet) {
            const totalTime = Math.floor((Date.now() - startTime) / 1000);

            console.log('');
            log('═══════════════════════════════════════════════', 'info');
            log(`${colors.green}${colors.bold}🎉 Internet connection restored!${colors.reset}`, 'success');
            log(`Total wait time: ${totalTime} seconds`, 'info');
            log('═══════════════════════════════════════════════', 'info');

            // Send desktop notification
            await sendNotification(
                '🌐 Internet Connection Restored!',
                `Modem restart completed.\nWait time: ${totalTime} seconds`,
                'normal'
            );

            return true;
        }

        // Wait until next check
        await new Promise(resolve => setTimeout(resolve, INTERNET_CHECK_CONFIG.checkInterval));
    }

    // Maximum attempts reached
    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    log('═══════════════════════════════════════════════', 'error');
    log(`${colors.red}${colors.bold}⚠️ Internet connection not restored after ${totalTime} seconds!${colors.reset}`, 'error');
    log('Please check the modem manually.', 'warning');
    log('═══════════════════════════════════════════════', 'error');

    await sendNotification(
        '⚠️ No Internet Connection!',
        `Waited ${totalTime} seconds but internet did not come back.\nPlease check the modem!`,
        'critical'
    );

    return false;
}

async function restartModem() {
    let browser;

    try {
        log('Starting modem restart process...', 'info');
        log(`Target: ${MODEM_CONFIG.url}`, 'info');

        // Start headless browser
        log('Starting browser...', 'step');
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

        // Set up dialog handler early (for confirmation dialog)
        let dialogHandled = false;
        page.on('dialog', async dialog => {
            log(`Dialog detected: ${dialog.message()}`, 'info');
            await dialog.accept();
            dialogHandled = true;
            log('Dialog accepted!', 'success');
        });

        // Navigate to modem page
        log('Connecting to modem page...', 'step');
        await page.goto(MODEM_CONFIG.url, {
            waitUntil: 'networkidle2',
            timeout: MODEM_CONFIG.timeout
        });

        // Fill in login credentials
        log('Entering login credentials...', 'step');

        // Find and fill username field
        await page.waitForSelector('input[name="Username"], input[id="Username"], input[type="text"]', { timeout: 10000 });
        await page.type('input[name="Username"], input[id="Username"], input[type="text"]', MODEM_CONFIG.username);

        // Find and fill password field
        await page.type('input[name="Password"], input[id="Password"], input[type="password"]', MODEM_CONFIG.password);

        // Click login button
        log('Logging in...', 'step');
        await page.click('input[id="LoginId"], input[type="submit"], button[type="submit"]');

        // Wait for page to load
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => { });
        await new Promise(resolve => setTimeout(resolve, 2000));

        log('Login successful!', 'success');

        // Navigate to management menu
        log('Navigating to management page...', 'step');

        // Find and click menu link via JavaScript
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

        // Navigate to System Management page
        log('Navigating to System Management page...', 'step');
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

        // Find and click restart button
        log('Searching for restart button...', 'step');

        const restartButton = await page.$('input[id="Btn_restart"], input.Btn_restart, button[id="Btn_restart"]');

        if (restartButton) {
            log('Restart button found!', 'success');
            log('Restarting modem...', 'warning');

            await restartButton.click();

            // Wait for custom HTML dialog to appear
            log('Waiting for confirmation dialog...', 'step');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Find and click #confirmOK button (modem uses custom dialog)
            const confirmButton = await page.$('#confirmOK, button#confirmOK, input#confirmOK');

            if (confirmButton) {
                log('Confirmation dialog found!', 'success');
                await confirmButton.click();
                log('Restart confirmed!', 'success');
            } else {
                // Alternative: Dialog may not be visible, search for confirmOK in page
                log('Searching for confirmation dialog (alternative method)...', 'warning');
                const confirmed = await page.evaluate(() => {
                    const okBtn = document.getElementById('confirmOK');
                    if (okBtn) {
                        okBtn.click();
                        return true;
                    }
                    return false;
                });

                if (confirmed) {
                    log('Restart confirmed (via JS)!', 'success');
                } else {
                    log('Confirmation button not found!', 'warning');
                }
            }

            // Wait for modem restart to begin
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            // Alternative method: Call restart function directly via JavaScript
            log('Button not found, trying alternative method...', 'warning');

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
        log(`${colors.green}${colors.bold}Modem restart process completed!${colors.reset}`, 'success');
        log('Modem will be active again in approximately 1-2 minutes.', 'info');
        log('═══════════════════════════════════════════════', 'info');

        // Close browser and start internet check
        if (browser) {
            await browser.close();
            browser = null;
        }

        // Check internet connection
        await waitForInternet();

    } catch (error) {
        log(`Error occurred: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run main function
restartModem();
