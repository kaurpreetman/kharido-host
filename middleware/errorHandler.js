// middleware/errorHandler.js
import multer from "multer";

export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific error
    return res.status(400).json({ error: `Multer error: ${err.message}` });
  } else if (err) {
    // General error
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  next();
};
