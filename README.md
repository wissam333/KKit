<div align="center">

<img src="interface.png" alt="KKit Logo" width="80" />

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

All real-time features (screen share, video calls, whiteboard, chat) run **peer-to-peer via WebRTC**. Your server never touches the data stream. Your hosting bill doesn't change whether you use it zero times or ten thousand times.

---

## 🚀 Features

### 📡 Mirror Room — Real-time Collaboration

Create or join a room instantly with a unique link. No accounts, no installs — just share the link and connect.

| Feature             | Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| 🎥 **Video Calls**  | Free, unlimited video and audio calls with a live participant grid. Camera and mic can be toggled per user. |
| 🖥️ **Screen Share** | Share your screen to all room participants in real time.                                                    |
| 🎨 **Whiteboard**   | Collaborative drawing canvas synced live across all connected members.                                      |
| 💬 **Chat**         | In-room text messaging and file sharing — images, videos, PDFs, documents, and more.                        |

> All Mirror Room features work across **different networks and devices** — powered by WebRTC + PeerJS. Your data flows directly browser-to-browser.

---

### ⚡ GramKit — Telegram Power Tools

Connect your Telegram account once using your own API credentials and unlock a suite of tools that Telegram's official app doesn't offer.

| Tool               | Description                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| 💼 **Job Scanner** | Scan all your channels and groups for job postings automatically                                   |
| 📊 **Analytics**   | Visualize message activity, peak hours, and top keywords for any channel                           |
| 🔔 **Monitor**     | Track changes and get alerts for specific keywords in your channels                                |
| 🧹 **Cleaner**     | Bulk delete your own messages from any group or channel                                            |
| 👥 **Members**     | Export and browse member lists from groups you admin                                               |
| 🖼️ **Media**       | Browse and download media files from your chats                                                    |
| 📦 **Archiver**    | Automatically archive inactive chats based on configurable rules                                   |
| 🔖 **Saves**       | Browse, search, and export your Telegram Saved Messages                                            |
| 🎁 **Wrapped**     | Your personal Telegram stats — messages sent, top contacts, activity by hour, and personality type |

> Your Telegram session stays **in your browser only** — never sent to any server.

---

## 💡 Why KKit vs Paid Alternatives?

| Feature                     | KKit         | Zoom           | TeamViewer | Miro      |
| --------------------------- | ------------ | -------------- | ---------- | --------- |
| Screen Share                | ✅ Free      | 💰 Paid        | 💰 Paid    | —         |
| Video Calls                 | ✅ Unlimited | ⏱️ 40min limit | 💰 Paid    | —         |
| Whiteboard                  | ✅ Free      | 💰 Paid        | —          | 💰 $10/mo |
| In-room Chat & File Sharing | ✅ Free      | 💰 Paid        | —          | —         |
| Self-hosted                 | ✅ Yes       | ❌ No          | ❌ No      | ❌ No     |
| No account needed           | ✅ Yes       | ❌ No          | ❌ No      | ❌ No     |
| Open source                 | ✅ Yes       | ❌ No          | ❌ No      | ❌ No     |

---

## 🏗️ Tech Stack

- **[Nuxt 3](https://nuxt.com)** — Full-stack Vue framework with SSR and PWA support
- **[Vue 3](https://vuejs.org)** — Composition API + `<script setup>`
- **[PeerJS](https://peerjs.com)** — WebRTC abstraction for P2P connections
- **[GramJS](https://github.com/gram-js/gramjs)** — Telegram MTProto client running entirely in the browser
- **[WebRTC](https://webrtc.org)** — Browser-native peer-to-peer media streaming
- **SCSS** — Scoped component styles with CSS custom properties for dark/light theming
- **[@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/frameworks/nuxt)** — Installable PWA with auto-update and offline support
- **[@nuxtjs/i18n](https://i18n.nuxtjs.org)** — Arabic (RTL) + English (LTR) support built in

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

# Start development server (HTTPS is enabled by default — required for WebRTC + PWA)
npm run dev
```

### For local cross-device testing (Mirror Room features)

The dev server runs with HTTPS by default. To also expose it on your local network so you can test on your phone:

```bash
npm run dev -- --host
```

Your phone can then access it via `https://YOUR_LAN_IP:3000`.

### Production build

```bash
npm run build
npm run preview
```

---

## 📡 Mirror Room — How It Works

```
User opens Toolbox → enters their name → creates a room
              ↓
Gets a unique room ID and shareable link
              ↓
Other participants open the link and join
              ↓
PeerJS broker exchanges a tiny handshake (< 1KB)
              ↓
WebRTC direct P2P connections established between all peers
              ↓
Video, audio, whiteboard, chat, and screen share flow
directly browser → browser. Your server sees nothing.
```

---

## 🔐 GramKit — Security Model

GramKit uses the **official Telegram API** (MTProto) through GramJS running entirely in your browser.

- Your API ID, API Hash, and phone number **never leave your device**
- Your session string is stored only in `localStorage` in your own browser
- No backend proxy — your browser connects directly to Telegram's servers
- You can revoke the session anytime from Telegram Settings → Devices → Active Sessions

To use GramKit you need a free Telegram API key from [my.telegram.org](https://my.telegram.org).

---

## 📱 PWA Support

KKit is a fully installable Progressive Web App:

- Standalone display mode — no browser chrome, feels like a native app
- Auto-updating service worker via Workbox
- Safe area support for iOS notch and home bar
- Works on Android, iOS, and desktop

---

## 🌍 Internationalization

KKit ships with full **Arabic (RTL)** and **English (LTR)** support. The UI automatically mirrors for RTL languages — layout, icons, and text direction all adapt without any page reload.

---

## 📁 Project Structure

```
kkit/
├── components/
│   ├── Room/               # Chat, VideoGrid, Whiteboard, ScreenShare
│   ├── Mirror/             # SharePanel for room link sharing
│   ├── Shared/Ui/          # Reusable UI components (buttons, inputs, modals, tables)
│   └── Home/               # Landing page components
├── composables/
│   ├── useRoom.js          # WebRTC room logic via PeerJS (video, chat, whiteboard)
│   ├── useTelegram.js      # GramJS Telegram client session management
│   ├── useTheme.js         # Dark/light mode + color palette switcher
│   └── ...
├── pages/
│   ├── index.vue           # App entry — GramKit / Toolbox selector
│   ├── toolbox/
│   │   ├── rooms.vue       # Mirror Room lobby (create / join)
│   │   └── room/[id].vue   # Active room page
│   └── gramkit/            # All GramKit tool pages
├── server/api/tg/          # Nitro server routes for Telegram API calls
└── i18n/locales/           # ar.json + en.json
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

[![Stars](https://img.shields.io/github/stars/wissam333/kkit?style=flat-square)](https://github.com/wissam333/kkit/stargazers)

</div>

---

<div align="center">
Built with ❤️ using Nuxt 3 + WebRTC — Free forever.
</div>
