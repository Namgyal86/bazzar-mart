import express from 'express';
import Banner from '../models/banner.model';

const router = express.Router();

// GET all active banners (public)
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: banners });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// GET all banners (admin)
router.get('/all', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1 });
    res.json({ success: true, data: banners });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// POST create banner
router.post('/', async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json({ success: true, data: banner });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// PUT update banner
router.put('/:id', async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: banner });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// DELETE banner
router.delete('/:id', async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
