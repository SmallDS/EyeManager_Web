import { selectTenant } from "../../utils/auth.js";

export default defineEventHandler(async (event) => selectTenant(event));
