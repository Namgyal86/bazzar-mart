import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { AuthRequest } from '../../shared/middleware/auth';
import { Notification } from './notification.model';
import { handleError } from '../../shared/middleware/error';

const router = Router();

// GET /api/v1/notifications
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.userId })
      .sort('-createdAt').limit(50);
    const unread = await Notification.countDocuments({ userId: req.user!.userId, isRead: false });
    res.json({ success: true, data: notifications, meta: { unread } });
  } catch (err) { handleError(err, res); }
});

// PATCH /api/v1/notifications/read-all
router.patch('/notifications/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.user!.userId, isRead: false }, { isRead: true });
    res.json({ success: true, data: null });
  } catch (err) { handleError(err, res); }
});
router.put('/notifications/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.user!.userId, isRead: false }, { isRead: true });
    res.json({ success: true, data: null });
  } catch (err) { handleError(err, res); }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { isRead: true }
    );
    res.json({ success: true, data: null });
  } catch (err) { handleError(err, res); }
});
router.put('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { isRead: true }
    );
    res.json({ success: true, data: null });
  } catch (err) { handleError(err, res); }
});

// POST /api/v1/notifications/internal  (no auth — internal use)
router.post('/notifications/internal', async (req: Request, res: Response) => {
  try {
    const notif = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notif });
  } catch (err) { handleError(err, res); }
});

// Admin
router.get('/notifications/admin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const broadcasts = await Notification.find({ userId: { $regex: /^BROADCAST:/ } }).sort('-createdAt').limit(20);
    const system = await Notification.find({ type: 'SYSTEM' }).sort('-createdAt').limit(20);
    const combined = [...broadcasts, ...system]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
    res.json({ success: true, data: combined });
  } catch (err) { handleError(err, res); }
});

router.post('/notifications/broadcast', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type = 'SYSTEM', target = 'ALL' } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, error: 'title and message required' }) as any;
    const notif = await Notification.create({ userId: `BROADCAST:${target}`, type, title, message, isRead: false });
    res.json({ success: true, data: notif, meta: { target, sent: true } });
  } catch (err) { handleError(err, res); }
});

export default router;
