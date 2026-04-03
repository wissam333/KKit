<div align="center">

<!-- Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2aabee,100:1a85c8&height=200&section=header&text=TeleJob%20Scanner&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Hunt%20jobs%20from%20Telegram%20channels%20%E2%80%94%20in%20seconds&descAlignY=58&descSize=18" width="100%"/>

<br/>

<p>
  <img src="https://img.shields.io/badge/Nuxt-3.x-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Vue-3-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Telegram%20MTProto-API-2aabee?style=for-the-badge&logo=telegram&logoColor=white" />
  <img src="https://img.shields.io/badge/i18n-AR%20%7C%20EN-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" />
</p>

<p>
  <img src="https://img.shields.io/github/stars/YOUR_USERNAME/YOUR_REPO?style=social" />
  <img src="https://img.shields.io/github/forks/YOUR_USERNAME/YOUR_REPO?style=social" />
</p>

<br/>

> **TeleJob Scanner** connects directly to your Telegram account via the official MTProto API and scans every channel and group you follow — finding job posts that match your keywords, in real time, without bots or scraping.

<br/>

[🚀 Live Demo](https://your-demo-url.com) • [📸 Screenshots](#-screenshots) • [⚙️ Setup](#%EF%B8%8F-setup) • [🌍 i18n](#-internationalization)

</div>

---

## ✨ Why TeleJob Scanner?

Most job seekers in Arabic-speaking markets know: **the best opportunities are posted in Telegram channels** — not LinkedIn. But scrolling through dozens of channels daily is exhausting.

TeleJob Scanner solves that. One login. All your channels. All the jobs. Instantly.

---

## 🎯 Features

| Feature | Description |
|--------|-------------|
| 🔐 **Native Telegram Login** | Uses official MTProto API — no bots, no third-party scraping |
| 💾 **Session Persistence** | Saves your session locally — connect once, use forever |
| 🔍 **Keyword Matching** | Add custom keywords (Arabic + English supported) |
| 📅 **Date Range Filtering** | Today / 3 days / 7 days / 30 days |
| 🏷️ **Live Keyword Chips** | Toggle which keywords to filter by on the dashboard |
| 📋 **One-Click Copy** | Copy any job post to clipboard instantly |
| 🔗 **Direct Telegram Links** | Jump straight to the original message in Telegram |
| 🌙 **Dark / Light Mode** | Follows your system theme via CSS variables |
| 🌍 **Arabic & English UI** | Full RTL/LTR support via `@nuxtjs/i18n` |
| ⚡ **Blazing Fast** | Nuxt 3 + SPA mode + critical CSS + async stylesheet loading |

---

## 📸 Screenshots

> *(Add your own screenshots here)*

| Setup Screen | OTP Verification | Job Dashboard |
|---|---|---|
| ![Setup](./screenshots/setup.png) | ![OTP](./screenshots/otp.png) | ![Dashboard](./screenshots/dashboard.png) |

---

## 🛠️ Tech Stack

```
Nuxt 3          → Framework (SSR disabled / SPA mode)
Vue 3           → UI reactivity
telegram.js     → MTProto API client (official Telegram protocol)
@nuxtjs/i18n    → Arabic / English with RTL support
nuxt-beastcss   → Critical CSS extraction
@nuxt/icon      → MDI icon set
SCSS            → Scoped styling with CSS variables
```

---

## ⚙️ Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### 2. Get your Telegram API credentials

1. Go to [https://my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Navigate to **API development tools**
4. Create a new app — you'll get an **API ID** and **API Hash**

> ⚠️ These are personal credentials tied to your Telegram account. Never share them publicly.

### 3. Run in development

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
npm run preview
```

---

## 🔑 How It Works

```
1. Enter your API ID, API Hash, and phone number
2. Receive a verification code in Telegram (just like logging in on a new device)
3. Enter the code → you're connected
4. The app fetches all your dialogs (channels + groups)
5. It scans messages within your selected date range
6. Any message matching your keywords appears as a job card
7. Your session is saved locally — next visit restores it automatically
```

No data leaves your browser. No backend. No server. Pure client-side.

---

## 🌍 Internationalization

The app ships with full Arabic and English translations. To add more languages:

1. Create a new locale file in `locales/` (e.g. `fr.json`)
2. Add the locale config in `nuxt.config.ts` under `i18n.locales`
3. All UI strings are pulled from the i18n keys — no hardcoded text

---

## 📁 Project Structure

```
├── pages/
│   └── jobs.vue          ← Main app (setup + OTP + dashboard)
├── locales/
│   ├── ar.json           ← Arabic translations
│   └── en.json           ← English translations
├── assets/scss/
│   ├── main.scss         ← Global styles
│   └── theme/
│       └── variables.scss← CSS variable tokens (colors, spacing)
├── nuxt.config.ts        ← Nuxt + Vite + i18n + polyfills config
```

---

## 🔒 Privacy & Security

- ✅ All processing happens **100% in your browser**
- ✅ Your session string is stored only in **your browser's localStorage**
- ✅ API credentials are **never sent to any external server**
- ✅ Uses the **official Telegram MTProto protocol** via `telegram.js`
- ❌ No analytics, no tracking, no backend

---

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

- [ ] Export jobs to CSV / Excel
- [ ] Notification sound when new jobs are found
- [ ] Auto-refresh on a timer
- [ ] More languages (French, Turkish, Urdu…)
- [ ] Channel allowlist / blocklist
- [ ] Highlight matched keywords inside job text

Feel free to open an issue or submit a PR.

---

## 📜 License

MIT © [Your Name](https://github.com/YOUR_USERNAME)

---

<div align="center">

**If this saved you time hunting for jobs — give it a ⭐ star. It means a lot!**

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a85c8,100:2aabee&height=100&section=footer" width="100%"/>

</div>
