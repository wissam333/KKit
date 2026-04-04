// composables/usePwaInstall.js
export const usePwaInstall = () => {
  const canInstall = useState("pwa_can_install", () => false);
  const isDismissed = useState("pwa_dismissed", () => false);
  const isInstalled = useState("pwa_installed", () => false);

  // Show banner if: prompt available AND user hasn't permanently dismissed
  const showBanner = computed(
    () => canInstall.value && !isDismissed.value && !isInstalled.value,
  );

  const setup = () => {
    if (!import.meta.client) return;

    if (window.matchMedia("(display-mode: standalone)").matches) {
      isInstalled.value = true;
      return;
    }

    if (localStorage.getItem("pwa_dismissed") === "1") {
      isDismissed.value = true;
    }

    // Prompt may have already fired before Vue mounted
    if (window.__pwaPrompt) {
      canInstall.value = true;
    }

    // Or it fires later
    window.addEventListener("pwa-prompt-ready", () => {
      canInstall.value = true;
    });

    // Also listen directly in case pwa-init.js hasn't run
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      window.__pwaPrompt = e;
      canInstall.value = true;
    });

    window.addEventListener("appinstalled", () => {
      isInstalled.value = true;
      canInstall.value = false;
      window.__pwaPrompt = null;
    });
  };

  const install = async () => {
    const prompt = window.__pwaPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      isInstalled.value = true;
      canInstall.value = false;
    }
    window.__pwaPrompt = null;
  };

  // Dismiss only for this session (banner comes back next visit)
  const dismiss = () => {
    isDismissed.value = true;
  };

  // Dismiss permanently
  const dismissForever = () => {
    isDismissed.value = true;
    localStorage.setItem("pwa_dismissed", "1");
  };

  // Reset so banner shows again (e.g. user wants to install later)
  const reset = () => {
    isDismissed.value = false;
    localStorage.removeItem("pwa_dismissed");
  };

  return {
    canInstall,
    showBanner,
    isInstalled,
    setup,
    install,
    dismiss,
    dismissForever,
    reset,
  };
};
