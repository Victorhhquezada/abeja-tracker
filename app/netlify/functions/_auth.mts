import crypto from "node:crypto";

const SECRET = process.env.APP_TOKEN_SECRET || "dev-secret-change-me";

export function signToken(): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 días
  const payload = `${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyToken(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [payload, sig] = decoded.split(".");
    if (!payload || !sig) return false;
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    return Date.now() < Number(payload);
  } catch {
    return false;
  }
}
