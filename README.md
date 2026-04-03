<div align="center">

<img src="public/logo.png" alt="KKit Logo" width="80" />

# KKit

**A free, open-source Swiss Army knife for the web.**
Screen sharing · Video calls · Whiteboard · Telegram tools — all in one app, zero cost, zero servers.

[![Nuxt](https://img.shields.io/badge/Nuxt-3-00DC82?style=flat-square&logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange?style=flat-square)](https://webrtc.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/wissam333/kkit?style=flat-square)](https://github.com/wissam333/kkit/stargazers)

[Live Demo](https://kkit.netlify.app/) · [Report Bug](https://github.com/wissam333/kkit/issues) · [Request Feature](https://github.com/wissam333/kkit/issues)

</div>

---

## ✨ What is KKit?

KKit is a **fully self-hosted, serverless toolbox** built with Nuxt 3. It replaces a stack of paid SaaS tools with a single open-source app that you deploy once and use forever — for free.

All real-time features (screen share, video calls, whiteboard, clipboard sync) run **peer-to-peer via WebRTC**. Your server never touches the data stream. Your hosting bill doesn't change whether you use it zero times or ten thousand times.

---

## 🚀 Features

### 📡 Mirror — Real-time Device Sync

Connect any two devices instantly by scanning a QR code. No accounts, no installs on the other device — just open a link.

| Feature               | Description                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| 🖥️ **Screen Share**   | Share your screen to any device across any network. Host captures, viewer watches live. |
| 🎥 **Video Call**     | Free, unlimited video and audio calls. Peer-to-peer, no time limits, no watermarks.     |
| 🎨 **Whiteboard**     | Collaborative drawing board. Draw on one device, see it live on the other.              |
| 📋 **Clipboard Sync** | Send text and links instantly between devices.                                          |
| 📝 **Live Notepad**   | Type on one device, see it appear in real time on the other.                            |

> All Mirror features work across **different WiFi networks**, different countries, mobile and desktop — powered by WebRTC + PeerJS.

---

### ⚡ GramKit — Telegram Power Tools

Connect your Telegram account once using your own API credentials and unlock a suite of tools that Telegram's official app doesn't offer.

| Tool               | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| 💼 **Job Scanner** | Scan all your channels and groups for job postings automatically         |
| 📊 **Analytics**   | Visualize message activity, peak hours, and top keywords for any channel |
| 🔔 **Monitor**     | Get alerts when specific keywords appear in your channels                |
| 🧹 **Cleaner**     | Bulk delete your own messages from any group or channel                  |
| 👥 **Members**     | Export and browse member lists from groups you admin                     |
| 🖼️ **Media**       | Browse and download media files from any channel                         |
| 📦 **Archiver**    | Archive messages and media from channels                                 |
| 🔖 **Saves**       | Manage your saved messages                                               |
| 🎁 **Wrapped**     | Your personal Telegram year-in-review stats                              |

> Your Telegram session stays **in your browser only** — never sent to any server.

---

## 💡 Why KKit vs Paid Alternatives?

| Feature           | KKit         | Zoom           | TeamViewer | Miro      | Pushbullet |
| ----------------- | ------------ | -------------- | ---------- | --------- | ---------- |
| Screen Share      | ✅ Free      | 💰 Paid        | 💰 Paid    | —         | —          |
| Video Calls       | ✅ Unlimited | ⏱️ 40min limit | 💰 Paid    | —         | —          |
| Whiteboard        | ✅ Free      | 💰 Paid        | —          | 💰 $10/mo | —          |
| Clipboard Sync    | ✅ Free      | —              | —          | —         | 💰 Paid    |
| Self-hosted       | ✅ Yes       | ❌ No          | ❌ No      | ❌ No     | ❌ No      |
| No account needed | ✅ Yes       | ❌ No          | ❌ No      | ❌ No     | ❌ No      |
| Open source       | ✅ Yes       | ❌ No          | ❌ No      | ❌ No     | ❌ No      |

---

## 🏗️ Tech Stack

- **[Nuxt 3](https://nuxt.com)** — Full-stack Vue framework
- **[Vue 3](https://vuejs.org)** — Composition API + `<script setup>`
- **[PeerJS](https://peerjs.com)** — WebRTC abstraction for P2P connections
- **[GramJS](https://github.com/gram-js/gramjs)** — Telegram MTProto client running in the browser
- **[WebRTC](https://webrtc.org)** — Browser-native peer-to-peer media streaming
- **SCSS** — Scoped component styles with CSS variables for theming
- **i18n** — Arabic (RTL) + English support built in

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repo
git clone https://github.com/wissam333/kkit.git
cd kkit

# Install dependencies
npm install

# Start development server
npm run dev
```

### For local cross-device testing (Mirror features)

Screen share and video calls require HTTPS. To test on your phone from your laptop:

```bash
npm run dev -- --https --host
```

Your phone can then access it via `https://YOUR_LAN_IP:3000`.

### Production build

```bash
npm run build
npm run preview
```

---

## 📱 Mirror — How It Works

```
Host opens Mirror page → gets a unique session ID
         ↓
Host clicks a mode (Screen Share / Video / Whiteboard etc.)
         ↓
A QR code + share link appears
         ↓
Viewer scans QR on their phone
         ↓
PeerJS broker exchanges a tiny handshake (< 1KB)
         ↓
WebRTC direct P2P connection established
         ↓
All data flows directly browser → browser
Your server sees nothing after this point
```

---

## 🔐 GramKit — Security Model

GramKit uses the **official Telegram API** (MTProto) through GramJS running entirely in your browser.

- Your API ID, API Hash, and phone number **never leave your device**
- Your session string is stored only in `localStorage` in your own browser
- No backend proxy — your browser connects directly to Telegram's servers
- You can revoke the session anytime from Telegram Settings → Active Sessions

To use GramKit you need a free Telegram API key from [my.telegram.org](https://my.telegram.org).

---

## 🌍 Internationalization

KKit ships with full **Arabic (RTL)** and **English (LTR)** support. The UI automatically mirrors for RTL languages including layout, icons, and text direction.

---

## 📁 Project Structure

```
kkit/
├── components/
│   ├── Mirror/          # Screen share, video call, whiteboard, clipboard, notepad
│   ├── Shared/Ui/       # Reusable UI components (buttons, inputs, modals, tables)
│   └── Home/            # Landing page components
├── composables/
│   ├── useMirrorPeer.js # PeerJS WebRTC abstraction
│   ├── useTelegram.js   # GramJS Telegram client
│   └── ...
├── pages/
│   ├── toolbox/mirror.vue  # Mirror hub page
│   └── gramkit/            # All GramKit tool pages
├── server/
│   ├── api/             # Server API endpoints
│   └── routes/ws/       # WebSocket signaling server
└── i18n/locales/        # ar.json + en.json translations
```

---

## 🤝 Contributing

Contributions are what make open source amazing. Any contributions you make are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## ⭐ Show Your Support

If KKit saved you money or time, please consider giving it a star — it helps more people discover the project!

<div align="center">

[![Star this repo](https://img.shields.io/github/stars/wissam333/kkit?style=for-the-badge&logo=github)](https://github.com/wissam333/kkit)

</div>

---

<div align="center">
Built with ❤️ using Nuxt 3 + WebRTC — Free forever.
</div>
