// composables/useTelegram.js
export const useTgConnected = () => useState("tg_connected", () => false);
export const useTgSession = () => useState("tg_session", () => "");
export const useTgPending = () =>
  useState("tg_pending", () => ({ session: "", codeHash: "" }));
export const useTgCreds = () =>
  useState("tg_creds", () => ({ apiId: "", apiHash: "" }));

export const useTelegram = () => {
  const isConnected = useTgConnected();
  const tgSession = useTgSession();
  const pending = useTgPending();
  const creds = useTgCreds();

  const post = (url, body) => $fetch(url, { method: "POST", body });

  /* ── Step 0: restore session ────────────────────────────── */
  const restoreSession = async ({ apiId, apiHash, session }) => {
    await post("/api/tg/connect", { apiId, apiHash, session });
    creds.value = { apiId, apiHash };
    tgSession.value = session;
    isConnected.value = true;
  };

  /* ── Step 1: send OTP ───────────────────────────────────── */
  const sendCode = async ({ apiId, apiHash, phone }) => {
    const res = await post("/api/tg/sendCode", { apiId, apiHash, phone });
    creds.value = { apiId, apiHash };
    pending.value = { session: res.session, codeHash: res.phoneCodeHash };
  };

  /* ── Step 2: verify OTP ─────────────────────────────────── */
  const signIn = async ({ phone, code }) => {
    const res = await post("/api/tg/signIn", {
      apiId: creds.value.apiId,
      apiHash: creds.value.apiHash,
      phone,
      code,
      phoneCodeHash: pending.value.codeHash,
      session: pending.value.session,
    });
    tgSession.value = res.session;
    isConnected.value = true;
    pending.value = { session: "", codeHash: "" };
    return res.session;
  };

  const disconnect = () => {
    tgSession.value = "";
    isConnected.value = false;
    pending.value = { session: "", codeHash: "" };
    creds.value = { apiId: "", apiHash: "" };
  };

  const getSession = () => tgSession.value;
  const getCreds = () => creds.value;

  /**
   * Stream job results via SSE.
   * @param {object} opts
   * @param {number}   opts.searchDays
   * @param {string[]} opts.keywords
   * @param {string}   opts.locale
   * @param {number}   opts.dialogLimit  - max channels to scan
   * @param {number}   opts.msgLimit     - max messages per channel
   * @param {function} opts.onTotal
   * @param {function} opts.onJob
   * @param {function} opts.onProgress
   * @param {function} opts.onDone
   * @param {function} opts.onError
   * @returns {function} cancel — call to close the SSE connection
   */
  const scanJobsStream = ({
    searchDays,
    keywords,
    locale,
    dialogLimit = 300,
    msgLimit = 100,
    onTotal,
    onJob,
    onProgress,
    onDone,
    onError,
  }) => {
    const { apiId, apiHash } = creds.value;
    const params = new URLSearchParams({
      apiId,
      apiHash,
      session: tgSession.value,
      searchDays: String(searchDays),
      keywords: JSON.stringify(keywords),
      locale,
      dialogLimit: String(dialogLimit),
      msgLimit: String(msgLimit),
    });

    const es = new EventSource(`/api/tg/jobs/scan?${params}`);

    es.onmessage = (e) => {
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }

      switch (data.type) {
        case "total":
          onTotal?.(data.total);
          break;
        case "job":
          onJob?.(data.job);
          break;
        case "progress":
          onProgress?.(data.scanned, data.total);
          break;
        case "done":
          onDone?.(data.scanned);
          es.close();
          break;
        case "error":
          onError?.(data.message);
          es.close();
          break;
      }
    };

    es.onerror = () => {
      onError?.("Connection lost");
      es.close();
    };

    return () => es.close();
  };

  return {
    isConnected,
    restoreSession,
    sendCode,
    signIn,
    disconnect,
    getSession,
    getCreds,
    scanJobsStream,
  };
};
