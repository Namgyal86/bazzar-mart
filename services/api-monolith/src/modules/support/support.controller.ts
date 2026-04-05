import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { Message } from './models/message.model';

export const submitContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body as {
      name?: string; email?: string; subject?: string; message?: string;
    };
    if (!subject || !message) { res.status(400).json({ success: false, error: 'subject and message required' }); return; }
    const doc = await Message.create({ name, email, subject, message, source: 'contact', type: 'general' });
    res.status(201).json({ success: true, data: doc });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const submitAdminContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, subject, message, orderId, userId, userEmail } = req.body as {
      type?: string; subject?: string; message?: string;
      orderId?: string; userId?: string; userEmail?: string;
    };
    if (!subject || !message) { res.status(400).json({ success: false, error: 'subject and message required' }); return; }
    const doc = await Message.create({
      subject, message,
      type:      type ?? 'other',
      orderId,
      userId:    userId    ?? req.user?.userId,
      userEmail: userEmail ?? req.user?.email,
      source:    'admin-contact',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const listMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const msgs = await Message.find({ source: 'contact' }).sort('-createdAt').limit(200);
    res.json({ success: true, data: msgs });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const listAdminMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const msgs = await Message.find({ source: 'admin-contact' }).sort('-createdAt').limit(200);
    res.json({ success: true, data: msgs });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const updateMessageStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status?: string };
    if (!status || !['open', 'resolved'].includes(status)) {
      res.status(400).json({ success: false, error: 'status must be open or resolved' }); return;
    }
    const msg = await Message.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!msg) { res.status(404).json({ success: false, error: 'Message not found' }); return; }
    res.json({ success: true, data: msg });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};
