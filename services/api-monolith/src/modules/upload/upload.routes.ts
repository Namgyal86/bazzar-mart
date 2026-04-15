/**
 * Upload module — streams images directly to Cloudinary.
 * No local disk storage; no uploads volume needed.
 * Returns: { success: true, data: { url: string, publicId: string } }
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate } from '../../shared/middleware/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Keep file in memory; stream straight to Cloudinary — no disk I/O
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();

// POST /api/v1/upload/image  — used by seller_app add_product_screen
router.post('/upload/image', authenticate, upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file provided' });
    return;
  }

  const stream = cloudinary.uploader.upload_stream(
    { folder: 'bazzar', resource_type: 'image' },
    (error, result) => {
      if (error || !result) {
        res.status(500).json({ success: false, error: error?.message ?? 'Cloudinary upload failed' });
        return;
      }
      res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
    },
  );

  stream.end(req.file.buffer);
});

export default router;
