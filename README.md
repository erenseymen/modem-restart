# 🔄 Modem Restart Automation

Node.js script to restart ZTE H3600 V9 modem with a single command.

**Features:** Auto-login • Modem restart • Internet monitoring • Desktop notification

## 🚀 Quick Start

```bash
git clone https://github.com/erenseymen/modem-restart.git
cd modem-restart && npm install
npm start
```

## ⚙️ Options

| Option | Short | Default |
|--------|-------|---------|
| `--url` | | `http://192.168.1.1/` |
| `--username` | `-u` | `admin` |
| `--password` | `-p` | `admin` |
| `--timeout` | `-t` | `30000` |
| `--help` | `-h` | |

```bash
node restart.js --url http://192.168.1.1/ -u admin -p myPass
```

## 📅 Cron Job

```bash
# Add to crontab -e (restart daily at 4:00 AM):
0 4 * * * cd /path/to/modem-restart && /usr/bin/node restart.js >> /tmp/modem-restart.log 2>&1
```

## 🔧 Troubleshooting

**Chrome won't start:** `sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0`

**Timeout errors:** Check modem IP and credentials.

---

## 📋 Requirements

- Node.js v18+
- Linux (for `notify-send`)

## 📄 License

ISC
