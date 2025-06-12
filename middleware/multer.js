// middleware/multer.js
import multer from "multer";
import path from "path";

// Use memory storage
const storage = multer.memoryStorage();

// Allowed MIME types and extensions
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

// File filter with mimetype + extension check
const fileFilter = (req, file, callback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    callback(null, true);
  } else {
    callback(new Error("Unsupported file type"), false);
  }
};

// Create multer instance with size limit
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

export default upload;
