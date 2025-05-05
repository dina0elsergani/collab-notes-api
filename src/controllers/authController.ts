import { Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '@/models/User';
import { config } from '@/config/config';
import { AuthRequest } from '@/middleware/auth';
import { createError, asyncHandler } from '@/middleware/errorHandler';

const generateToken = (userId: string, username: string, email: string) => {
  return jwt.sign(
    { userId, username, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw createError(
      existingUser.email === email
        ? 'Email already registered'
        : 'Username already taken',
      400
    );
  }

  // Create new user
  const user: IUser = new User({ username, email, password });
  await user.save();

  // Generate token
  const token = generateToken(user._id.toString(), user.username, user.email);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    },
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email }).select('+password') as IUser;
  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Generate token
  const token = generateToken(user._id.toString(), user.username, user.email);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    },
  });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.userId);
  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username } = req.body;
  
  const user = await User.findById(req.user?.userId);
  if (!user) {
    throw createError('User not found', 404);
  }

  if (username && username !== user.username) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw createError('Username already taken', 400);
    }
    user.username = username;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        updatedAt: user.updatedAt,
      },
    },
  });
});