import multer from "multer";
import { badRequest } from "../utils/http-error.js";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
]);

/** In-memory upload (driver-agnostic): the buffer is handed to StorageService. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(badRequest(`Unsupported image type: ${file.mimetype}`));
  },
}).single("file");
