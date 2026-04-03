import { networkInterfaces } from "os";

export default defineEventHandler(() => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === "4" && !net.internal) {
        return { ip: net.address };
      }
    }
  }
  return { ip: "localhost" };
});
