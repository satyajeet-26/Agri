import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;

export function normalizeAadhaarNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s-]/g, "");
  return /^[2-9]\d{11}$/.test(digits) ? digits : null;
}

export function encryptAadhaarNumber(aadhaarNumber: string): string {
  const key = getAadhaarEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(aadhaarNumber, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    ciphertext.toString("hex"),
  ].join(".");
}

export function decryptAadhaarNumber(encryptedAadhaar: string): string {
  const parts = encryptedAadhaar.split(".");
  if (
    parts.length !== 3 ||
    !/^[a-fA-F0-9]{24}$/.test(parts[0]) ||
    !/^[a-fA-F0-9]{32}$/.test(parts[1]) ||
    !/^[a-fA-F0-9]+$/.test(parts[2])
  ) {
    throw new Error("Saved Aadhaar data is invalid.");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getAadhaarEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");

  if (!/^[2-9]\d{11}$/.test(plaintext)) {
    throw new Error("Saved Aadhaar data is invalid.");
  }
  return plaintext;
}

function getAadhaarEncryptionKey(): Buffer {
  const keyHex = process.env.FARMER_DATA_ENCRYPTION_KEY?.trim() || "";
  if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
    throw new Error(
      "Aadhaar encryption is not configured. Set FARMER_DATA_ENCRYPTION_KEY to a 64-character hexadecimal key."
    );
  }
  return Buffer.from(keyHex, "hex");
}

export function isValidFarmerPhotoDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value
  );
  if (!match) return false;

  const [, format, base64] = match;
  if (base64.length > Math.ceil(MAX_PROFILE_PHOTO_BYTES / 3) * 4) {
    return false;
  }
  const bytes = Buffer.from(base64, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PROFILE_PHOTO_BYTES ||
    bytes.toString("base64") !== base64
  ) {
    return false;
  }

  if (format === "jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (format === "png") {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}
