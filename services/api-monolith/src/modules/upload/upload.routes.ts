/**
 * Upload module — handles image uploads from mobile seller app and web.
 * Stores files in /tmp/uploads (ephemeral in Docker; swap for S3 in production).
 * Returns: { success: true, data: { url: string } }
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../../shared/middleware/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/bazzar-uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();

// POST /api/v1/upload/image  — used by seller_app add_product_screen
router.post('/upload/image', authenticate, upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ success: false, error: 'No image file provided' }); return; }
  // Return a URL that can be served back — in production replace with S3 CDN URL
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8100';
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  res.json({ success: true, data: { url, filename: req.file.filename } });
});

export default router;
