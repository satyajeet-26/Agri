const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function readFarmerProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      reject(new Error("Choose a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      reject(new Error("Photo must be 1 MB or smaller."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the selected photo."));
    };
    reader.onerror = () => reject(new Error("Could not read the selected photo."));
    reader.readAsDataURL(file);
  });
}
