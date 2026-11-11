import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { DatabaseSchema } from "@/types";

export const ADMIN_SESSION_COOKIE = "agri_admin_session";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

function getSigningSecret(db: DatabaseSchema): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    db.admin.sessionSecret ||
    db.admin.passwordHash
  );
}

function sign(expiration: string, db: DatabaseSchema): string {
  return createHmac("sha256", getSigningSecret(db))
    .update(`admin:${expiration}`)
    .digest("hex");
}

export function setAdminSessionCookie(response: NextResponse, db: DatabaseSchema): void {
  const expiration = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE);
  response.cookies.set(ADMIN_SESSION_COOKIE, `${expiration}.${sign(expiration, db)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isAdminRequest(request: Request, db: DatabaseSchema): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));

  const rejectSession = (reason: string): false => {
    console.warn("Admin session verification failed.", {
      hostname: new URL(request.url).hostname,
      path: new URL(request.url).pathname,
      cookieName: ADMIN_SESSION_COOKIE,
      cookiePresent: Boolean(cookie),
      reason,
    });
    return false;
  };

  if (!cookie) return rejectSession("cookie_missing");

  const token = cookie.slice(ADMIN_SESSION_COOKIE.length + 1);
  const separator = token.indexOf(".");
  if (separator <= 0) return rejectSession("malformed_cookie");

  const expiration = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expirationSeconds = Number(expiration);
  if (
    !Number.isSafeInteger(expirationSeconds) ||
    expirationSeconds <= Math.floor(Date.now() / 1000) ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    return rejectSession("invalid_or_expired_cookie");
  }

  const expected = sign(expiration, db);
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
    return rejectSession("signature_mismatch");
  }
  return true;
}

export function unauthorizedAdminResponse(): NextResponse {
  return NextResponse.json(
    { success: false, message: "Admin authentication is required." },
    { status: 401 }
  );
}
