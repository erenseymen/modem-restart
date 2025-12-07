# 🔄 Modem Restart Automation

H3600 V9 modemi tek komutla yeniden başlatmak için otomasyon scripti.

## 📋 Gereksinimler

- Node.js v18 veya üzeri
- npm

## 🚀 Kurulum

```bash
cd modem-restart
npm install
```

## 💻 Kullanım

### Yöntem 1: npm ile
```bash
npm start
```

### Yöntem 2: Doğrudan Node.js ile
```bash
node restart.js
```

### Yöntem 3: Bash script ile
```bash
./modem-restart
```

### Yöntem 4: Global kurulum (her yerden erişim)
```bash
# Proje klasöründe
npm link

# Artık her yerden çalıştırabilirsiniz:
modem-restart
```

## ⚙️ Yapılandırma

Modem bilgilerini değiştirmek için `restart.js` dosyasındaki `MODEM_CONFIG` objesini düzenleyin:

```javascript
const MODEM_CONFIG = {
    url: 'http://192.168.1.1/',
    username: 'admin',
    password: 'your_password',
    timeout: 30000
};
```

## 📅 Zamanlı Görev (Cron Job)

Modemi düzenli aralıklarla yeniden başlatmak için cron job ekleyebilirsiniz:

```bash
# Crontab düzenle
crontab -e

# Her gün saat 04:00'te yeniden başlat
0 4 * * * cd /home/erens/repos/new-idea-2025-12-07_11-07-34/modem-restart && /usr/bin/node restart.js >> /tmp/modem-restart.log 2>&1
```

## 🔧 Alias Oluşturma

Daha kısa bir komut için shell alias ekleyebilirsiniz:

**Fish Shell için (~/.config/fish/config.fish):**
```fish
alias modem-restart="node /home/erens/repos/new-idea-2025-12-07_11-07-34/modem-restart/restart.js"
```

**Bash için (~/.bashrc):**
```bash
alias modem-restart="node /home/erens/repos/new-idea-2025-12-07_11-07-34/modem-restart/restart.js"
```

## 📝 Notlar

- Script headless Chrome kullanır (görünmez tarayıcı)
- Modem yeniden başladıktan sonra ~1-2 dakika bekleyin
- İnternet bağlantınız geçici olarak kesilecektir

## 🛠️ Sorun Giderme

### Hata: Chrome başlatılamıyor
```bash
# Gerekli bağımlılıkları yükleyin
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```

### Hata: Timeout
Modem'in IP adresi veya giriş bilgilerini kontrol edin.
