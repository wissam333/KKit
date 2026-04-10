// composables/useFullscreen.js
// Fullscreen + landscape orientation lock for mobile game sessions

import { ref } from "vue";

export function useFullscreen() {
  const isFullscreen = ref(false);

  const _onFsChange = () => {
    isFullscreen.value = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
  };

  const _lockLandscape = async () => {
    try {
      // Must be called AFTER fullscreen is granted — browsers enforce this
      if (screen?.orientation?.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch {
      // Silently ignore — not all browsers/PWAs support orientation lock
    }
  };

  const _unlockOrientation = () => {
    try {
      screen?.orientation?.unlock?.();
    } catch {}
  };

  const enter = async (el) => {
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      await _lockLandscape();
    } catch (e) {
      console.warn("[useFullscreen] enter failed:", e);
    }
  };

  const exit = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen)
        await document.webkitExitFullscreen();
    } catch (e) {
      console.warn("[useFullscreen] exit failed:", e);
    }
    _unlockOrientation();
  };

  const toggle = (el) => (isFullscreen.value ? exit() : enter(el));

  const mount = () => {
    if (!process.client) return;
    document.addEventListener("fullscreenchange", _onFsChange);
    document.addEventListener("webkitfullscreenchange", _onFsChange);
  };

  const unmount = () => {
    if (!process.client) return;
    document.removeEventListener("fullscreenchange", _onFsChange);
    document.removeEventListener("webkitfullscreenchange", _onFsChange);
    _unlockOrientation();
  };

  return { isFullscreen, enter, exit, toggle, mount, unmount };
}
