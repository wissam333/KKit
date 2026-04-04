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

  /* ── Step 0: restore session from localStorage ───────────── */
  const restoreSession = async ({ apiId, apiHash, session }) => {
    await post("/api/tg/connect", { apiId, apiHash, session });
    creds.value = { apiId, apiHash };
    tgSession.value = session;
    isConnected.value = true;
  };

  /* ── Step 1: send OTP ────────────────────────────────────── */
  const sendCode = async ({ apiId, apiHash, phone }) => {
    const res = await post("/api/tg/sendCode", { apiId, apiHash, phone });
    creds.value = { apiId, apiHash };
    pending.value = { session: res.session, codeHash: res.phoneCodeHash };
  };

  /* ── Step 2: verify OTP ──────────────────────────────────── */
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

  const getDialogs = () =>
    post("/api/tg/dialogs", {
      ...creds.value,
      session: tgSession.value,
    });

  return {
    isConnected,
    restoreSession,
    sendCode,
    signIn,
    disconnect,
    getSession,
    getCreds,
    getDialogs,
  };
};
