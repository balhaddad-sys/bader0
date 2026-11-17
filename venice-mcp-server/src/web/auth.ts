/**
 * Sign-in for the web app. It can spend Venice credits and use the GPU, so every API call needs the token.
 *
 * A phone signs in once (scan the QR code or paste the token); the server then sets an HttpOnly, SameSite=Strict
 * cookie holding an HMAC of the token, so <video> and download requests, which cannot send headers, are authorised too
 * and the raw token never sits in a cookie. Scripts can send `Authorization: Bearer <token>` instead.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { NextFunction, Request, Response } from "express";
import { webConfig } from "../config.js";

export const MIN_TOKEN_LENGTH = 16;
const COOKIE = "vmcp_session";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 3600;
const MAX_FAILURES = 8;
const FAILURE_WINDOW_MS = 10 * 60_000;

export interface LoadedToken {
  token: string;
  source: "env" | "file" | "generated";
  file?: string;
}

/** WEB_TOKEN if set; otherwise the token saved in WEB_TOKEN_FILE; otherwise a new random one saved there (mode 0600). */
export async function loadToken(): Promise<LoadedToken> {
  if (webConfig.token) {
    if (webConfig.token.length < MIN_TOKEN_LENGTH) {
      throw new Error(`WEB_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters: anyone who has it can spend your Venice credits and use your GPU.`);
    }
    return { token: webConfig.token, source: "env" };
  }
  const file = webConfig.tokenFile;
  try {
    const saved = (await readFile(file, "utf8")).trim();
    if (saved.length >= MIN_TOKEN_LENGTH) return { token: saved, source: "file", file };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Could not read the saved web token ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const token = randomBytes(24).toString("base64url");
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, `${token}\n`, { mode: 0o600 });
  await chmod(file, 0o600);
  return { token, source: "generated", file };
}

/** Compares in constant time, whatever the lengths. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

export function createAuth(token: string) {
  const session = createHmac("sha256", token).update("venice-mcp-web-session").digest("hex");
  const failures = new Map<string, { count: number; resetAt: number }>();

  const isAuthed = (req: Request): boolean => {
    const header = req.headers.authorization ?? "";
    if (header.startsWith("Bearer ") && safeEqual(header.slice(7), token)) return true;
    const cookie = readCookie(req, COOKIE);
    return cookie !== undefined && safeEqual(cookie, session);
  };

  const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (isAuthed(req)) return next();
    res.status(401).json({ error: "unauthorized", message: "Sign in with the token first." });
  };

  const cookie = (req: Request, value: string, maxAge: number): string =>
    [`${COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAge}`, ...(req.secure ? ["Secure"] : [])].join("; ");

  /** POST /api/login {token}. Repeated wrong tokens from one address are locked out for a while. */
  const login = (req: Request, res: Response): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const record = failures.get(key);
    if (record && record.resetAt > now && record.count >= MAX_FAILURES) {
      res.setHeader("Retry-After", String(Math.ceil((record.resetAt - now) / 1000)));
      res.status(429).json({ error: "too_many_attempts", message: "Too many wrong tokens. Wait a few minutes and try again." });
      return;
    }
    const given = (req.body as { token?: unknown } | undefined)?.token;
    if (typeof given === "string" && safeEqual(given.trim(), token)) {
      failures.delete(key);
      res.setHeader("Set-Cookie", cookie(req, session, COOKIE_MAX_AGE_SECONDS));
      res.json({ ok: true });
      return;
    }
    const current = record && record.resetAt > now ? record : { count: 0, resetAt: now + FAILURE_WINDOW_MS };
    current.count++;
    failures.set(key, current);
    res.status(401).json({ error: "wrong_token", message: "That token is not right." });
  };

  const logout = (req: Request, res: Response): void => {
    res.setHeader("Set-Cookie", cookie(req, "", 0));
    res.json({ ok: true });
  };

  return { isAuthed, requireAuth, login, logout };
}
