// Cloudflare Workers runtime has no Node "crypto" module — this uses the Web Crypto API
// (crypto.subtle), which is available globally in Workers, to sign/verify the same kind
// of HMAC-SHA256 session token the Netlify version produced with node:crypto.

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  return atob(padded);
}

/** El token lleva el atleta dentro de lo firmado: `${exp}~${athlete}`. Los tokens anteriores a que
 *  existieran varios atletas solo llevan `${exp}` y siempre fueron de "abeja". */
export async function signToken(secret: string, athlete: string): Promise<string> {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 días
  const payload = `${exp}~${athlete}`;
  const key = await hmacKey(secret);
  const sig = bytesToHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return toBase64Url(`${payload}.${sig}`);
}

/** Devuelve el id del atleta dueño del token, o null si el token es inválido o venció. */
export async function verifyToken(req: Request, secret: string): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const decoded = fromBase64Url(token);
    const [payload, sig] = decoded.split(".");
    if (!payload || !sig) return null;
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, hexToBytes(sig), enc.encode(payload));
    if (!valid) return null;
    const [exp, athlete] = payload.split("~");
    if (!(Date.now() < Number(exp))) return null;
    return athlete || "abeja";
  } catch {
    return null;
  }
}
