export const useLocalUrl = () => {
  const localIp = useState<string>("localIp", () => "");

  const fetchIp = async () => {
    if (!import.meta.client) return;
    // Already resolved or not on localhost
    if (localIp.value) return;

    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      // Already on real IP or deployed domain — use as-is
      localIp.value = window.location.origin;
      return;
    }

    try {
      const data = await $fetch<{ ip: string }>("/api/local-ip");
      localIp.value = `https://${data.ip}:${window.location.port || 3000}`;
    } catch {
      localIp.value = window.location.origin;
    }
  };

  const buildUrl = (path: string) => {
    const base = localIp.value || window.location.origin;
    return `${base}${path}`;
  };

  return { localIp, fetchIp, buildUrl };
};
