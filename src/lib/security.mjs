import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const passwordHash = scryptSync(String(password), salt, 64).toString("hex");
  return { passwordHash, passwordSalt: salt };
}

export function verifyPassword(password, passwordHash, passwordSalt) {
  if (!passwordHash || !passwordSalt) return false;
  const candidate = scryptSync(String(password), passwordSalt, 64);
  const expected = Buffer.from(passwordHash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 6) return "******";
  return `${value.slice(0, 3)}******${value.slice(-3)}`;
}
