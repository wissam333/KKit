import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, ids } = await readBody(event);
  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  let done = 0;
  try {
    for (const id of ids) {
      try {
        const entity = await client.getEntity(id);
        const inputPeer = await client.getInputEntity(entity);
        await client.invoke(
          new Api.folders.EditPeerFolders({
            folderPeers: [
              new Api.InputFolderPeer({ peer: inputPeer, folderId: 1 }),
            ],
          }),
        );
        done++;
      } catch {
        /* skip individual failures */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return { done };
  } finally {
    await client.disconnect();
  }
});
