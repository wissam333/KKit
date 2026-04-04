// This runs immediately, before Vue hydrates
window.__pwaPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__pwaPrompt = e;
  // Signal Vue when it's ready
  window.dispatchEvent(new Event("pwa-prompt-ready"));
});
