# 🔄 Modem Restart Automation

[🇹🇷 Türkçe](#türkçe) | [🇬🇧 English](#english)

---

## English

A Node.js automation script to restart H3600 V9 modem with a single command.

### ✨ Features

- 🌐 Automatic login to modem web interface
- 🔄 Triggers modem restart
- 📡 Monitors internet connectivity after restart
- 🔔 Desktop notification when internet is restored
- ⚙️ Configurable via command-line arguments

### 📋 Requirements

- Node.js v18 or higher
- npm
- Linux (for desktop notifications via `notify-send`)

### 🚀 Installation

```bash
git clone https://github.com/YOUR_USERNAME/modem-restart.git
cd modem-restart
npm install
```

### 💻 Usage

#### Basic Usage
```bash
npm start
# or
node restart.js
```

#### With Command-Line Arguments
```bash
node restart.js --url http://192.168.1.1/ --username admin --password mySecretPass
```

#### Available Options
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--url` | | Modem URL | `http://192.168.1.1/` |
| `--username` | `-u` | Username | `admin` |
| `--password` | `-p` | Password | `admin` |
| `--timeout` | `-t` | Timeout in ms | `30000` |
| `--help` | `-h` | Show help | |

#### Global Installation
```bash
npm link
# Now run from anywhere:
modem-restart
```

### 📅 Cron Job (Scheduled Restart)

To restart the modem automatically at a scheduled time:

```bash
crontab -e

# Add this line to restart every day at 4:00 AM:
0 4 * * * cd /path/to/modem-restart && /usr/bin/node restart.js >> /tmp/modem-restart.log 2>&1
```

### 🔧 Troubleshooting

**Chrome won't start:**
```bash
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```

**Timeout errors:**
Check your modem's IP address and login credentials.

---

## Türkçe

H3600 V9 modemi tek komutla yeniden başlatmak için Node.js otomasyon scripti.

### ✨ Özellikler

- 🌐 Modem web arayüzüne otomatik giriş
- 🔄 Modem yeniden başlatma
- 📡 Restart sonrası internet bağlantısı kontrolü
- 🔔 İnternet geldiğinde masaüstü bildirimi
- ⚙️ Komut satırı parametreleri ile yapılandırma

### 📋 Gereksinimler

- Node.js v18 veya üzeri
- npm
- Linux (`notify-send` için)

### 🚀 Kurulum

```bash
git clone https://github.com/YOUR_USERNAME/modem-restart.git
cd modem-restart
npm install
```

### 💻 Kullanım

#### Temel Kullanım
```bash
npm start
# veya
node restart.js
```

#### Komut Satırı Parametreleri ile
```bash
node restart.js --url http://192.168.1.1/ --username admin --password gizliSifrem
```

#### Mevcut Parametreler
| Parametre | Kısa | Açıklama | Varsayılan |
|-----------|------|----------|------------|
| `--url` | | Modem URL'i | `http://192.168.1.1/` |
| `--username` | `-u` | Kullanıcı adı | `admin` |
| `--password` | `-p` | Şifre | `admin` |
| `--timeout` | `-t` | Zaman aşımı (ms) | `30000` |
| `--help` | `-h` | Yardım göster | |

#### Global Kurulum
```bash
npm link
# Artık her yerden çalıştırabilirsiniz:
modem-restart
```

### 📅 Zamanlı Görev (Cron Job)

Modemi düzenli aralıklarla yeniden başlatmak için:

```bash
crontab -e

# Her gün saat 04:00'te yeniden başlat:
0 4 * * * cd /path/to/modem-restart && /usr/bin/node restart.js >> /tmp/modem-restart.log 2>&1
```

### � Sorun Giderme

**Chrome başlatılamıyor:**
```bash
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```

**Timeout hatası:**
Modem'in IP adresi veya giriş bilgilerini kontrol edin.

---

## 📄 License

ISC
