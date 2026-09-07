import { Router, Response } from 'express';
import DeletionRecord from '../models/DeletionRecord.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const records = await DeletionRecord.find()
      .sort({ deletedAt: -1 })
      .lean();

    res.json(
      records.map((record) => ({
        id: record._id.toString(),
        type: record.type,
        originalId: record.originalId,
        snapshot: record.snapshot,
        deletedAt: record.deletedAt,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve deletion history' });
  }
});

export default router;
