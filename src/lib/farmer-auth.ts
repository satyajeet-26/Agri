import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { DatabaseSchema } from "@/types";

export const FARMER_SESSION_COOKIE = "agri_farmer_session";
const FARMER_SESSION_MAX_AGE = 60 * 60 * 12;

function getSigningSecret(db: DatabaseSchema): string {
  return (
    process.env.FARMER_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    db.admin.sessionSecret ||
    db.admin.passwordHash
  );
}

function sign(payload: string, db: DatabaseSchema): string {
  return createHmac("sha256", getSigningSecret(db))
    .update(`farmer:${payload}`)
    .digest("hex");
}

export function setFarmerSessionCookie(
  response: NextResponse,
  farmerId: string,
  db: DatabaseSchema
): void {
  const payload = Buffer.from(
    JSON.stringify({
      farmerId,
      expiresAt: Math.floor(Date.now() / 1000) + FARMER_SESSION_MAX_AGE,
    })
  ).toString("base64url");
  response.cookies.set(FARMER_SESSION_COOKIE, `${payload}.${sign(payload, db)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: FARMER_SESSION_MAX_AGE,
  });
}

export function clearFarmerSessionCookie(response: NextResponse): void {
  response.cookies.set(FARMER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function isFarmerRequest(
  request: Request,
  farmerId: string,
  db: DatabaseSchema
): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FARMER_SESSION_COOKIE}=`));

  if (!cookie) return false;

  const token = cookie.slice(FARMER_SESSION_COOKIE.length + 1);
  const separator = token.indexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;

  const expected = sign(payload, db);
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
    return false;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { farmerId?: unknown; expiresAt?: unknown };
    return (
      session.farmerId === farmerId &&
      typeof session.expiresAt === "number" &&
      Number.isSafeInteger(session.expiresAt) &&
      session.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
