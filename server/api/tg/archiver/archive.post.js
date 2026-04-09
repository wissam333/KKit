import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";

const BATCH_SIZE = 5;
const DELAY_MS = 350;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, ids } = await readBody(event);

  if (!Array.isArray(ids) || !ids.length) {
    throw createError({ statusCode: 400, message: "No IDs provided" });
  }

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 }
  );

  await client.connect();

  let done = 0;
  const failed = [];

  try {
    // Process in batches — Telegram tolerates a few folderPeers per invoke
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const folderPeers = [];

      for (const id of batch) {
        try {
          const inputPeer = await client.getInputEntity(id);
          folderPeers.push(
            new Api.InputFolderPeer({ peer: inputPeer, folderId: 1 })
          );
        } catch {
          failed.push(id);
        }
      }

      if (folderPeers.length) {
        try {
          await client.invoke(
            new Api.folders.EditPeerFolders({ folderPeers })
          );
          done += folderPeers.length;
        } catch {
          failed.push(...batch);
        }
      }

      if (i + BATCH_SIZE < ids.length) await sleep(DELAY_MS);
    }

    return { done, failed, total: ids.length };
  } finally {
    await client.disconnect();
  }
});