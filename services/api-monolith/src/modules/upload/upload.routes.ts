import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate } from '../../shared/middleware/auth';

const CLOUDINARY_CONFIGURED =
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', '..', 'uploads');
if (!CLOUDINARY_CONFIGURED && !fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();

router.post('/upload/image', authenticate, upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file provided' });
    return;
  }

  if (CLOUDINARY_CONFIGURED) {
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
    return;
  }

  // Local fallback — save to uploads/ folder
  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  fs.writeFile(filepath, req.file.buffer, (err) => {
    if (err) {
      res.status(500).json({ success: false, error: 'Failed to save file locally' });
      return;
    }
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8100';
    const url = `${baseUrl}/uploads/${filename}`;
    res.json({ success: true, data: { url, publicId: filename } });
  });
});

export default router;
