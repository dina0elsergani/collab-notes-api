import { Response } from 'express';
import User from '@/models/User';
import { AuthRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

export const searchUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, limit = 10 } = req.query;
  const currentUserId = req.user?.userId;

  if (!q || typeof q !== 'string' || q.length < 2) {
    res.json({
      success: true,
      data: { users: [] },
    });
    return;
  }

  const users = await User.find({
    _id: { $ne: currentUserId }, // Exclude current user
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ],
  })
    .select('username email')
    .limit(Number(limit));

  res.json({
    success: true,
    data: { users },
  });
});