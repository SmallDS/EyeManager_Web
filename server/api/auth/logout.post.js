import { clearWebSession } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  await clearWebSession(event);
  return { ok: true };
});
