import { Response } from 'express';
import mongoose from 'mongoose';
import Note from '@/models/Note';
import User from '@/models/User';
import { AuthRequest } from '@/middleware/auth';
import { createError, asyncHandler } from '@/middleware/errorHandler';

export const createNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content = '' } = req.body;
  const userId = req.user?.userId;

  const note = new Note({
    title,
    content,
    owner: userId,
  });

  await note.save();
  await note.populate('owner', 'username email');

  res.status(201).json({
    success: true,
    message: 'Note created successfully',
    data: { note },
  });
});

export const getNotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { page = 1, limit = 10, search } = req.query;

  const query: any = {
    $or: [
      { owner: userId },
      { 'collaborators.user': userId },
    ],
  };

  if (search) {
    query.$text = { $search: search as string };
  }

  const notes = await Note.find(query)
    .populate('owner', 'username email')
    .populate('collaborators.user', 'username email')
    .sort({ updatedAt: -1 })
    .limit(Number(limit) * 1)
    .skip((Number(page) - 1) * Number(limit))
    .select('-versions'); // Exclude version history from list

  const total = await Note.countDocuments(query);

  res.json({
    success: true,
    data: {
      notes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

export const getNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid note ID', 400);
  }

  const note = await Note.findById(id)
    .populate('owner', 'username email')
    .populate('collaborators.user', 'username email')
    .populate('versions.modifiedBy', 'username email');

  if (!note) {
    throw createError('Note not found', 404);
  }

  if (!note.isUserAuthorized(userId!, 'read')) {
    throw createError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { note },
  });
});

export const updateNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const userId = req.user?.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid note ID', 400);
  }

  const note = await Note.findById(id);
  if (!note) {
    throw createError('Note not found', 404);
  }

  if (!note.isUserAuthorized(userId!, 'write')) {
    throw createError('Write access denied', 403);
  }

  // Add version history if content changed
  if (content !== undefined && content !== note.content) {
    note.addVersion(note.content, userId!);
  }

  // Update note
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;

  await note.save();
  await note.populate('owner', 'username email');
  await note.populate('collaborators.user', 'username email');

  res.json({
    success: true,
    message: 'Note updated successfully',
    data: { note },
  });
});

export const deleteNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid note ID', 400);
  }

  const note = await Note.findById(id);
  if (!note) {
    throw createError('Note not found', 404);
  }

  // Only owner can delete the note
  if (note.owner.toString() !== userId) {
    throw createError('Only the owner can delete this note', 403);
  }

  await Note.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Note deleted successfully',
  });
});

export const addCollaborator = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { email, role = 'read' } = req.body;
  const userId = req.user?.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid note ID', 400);
  }

  const note = await Note.findById(id);
  if (!note) {
    throw createError('Note not found', 404);
  }

  // Only owner can add/remove collaborators
  if (note.owner.toString() !== userId) {
    throw createError('Only the owner can manage collaborators', 403);
  }

  // Find user by email
  const collaboratorUser = await User.findOne({ email });
  if (!collaboratorUser) {
    throw createError('User not found', 404);
  }

  // Check if user is already a collaborator
  const existingCollaborator = note.collaborators.find(
    (c) => c.user.toString() === collaboratorUser._id.toString()
  );

  if (existingCollaborator) {
    // Update existing collaborator role
    existingCollaborator.role = role;
  } else {
    // Add new collaborator
    note.collaborators.push({
      user: collaboratorUser._id,
      role,
      addedAt: new Date(),
    });
  }

  await note.save();
  await note.populate('collaborators.user', 'username email');

  res.json({
    success: true,
    message: 'Collaborator added successfully',
    data: { note },
  });
});

export const removeCollaborator = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, collaboratorId } = req.params;
  const userId = req.user?.userId;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(collaboratorId)) {
    throw createError('Invalid ID format', 400);
  }

  const note = await Note.findById(id);
  if (!note) {
    throw createError('Note not found', 404);
  }

  // Only owner can remove collaborators
  if (note.owner.toString() !== userId) {
    throw createError('Only the owner can manage collaborators', 403);
  }

  // Remove collaborator
  note.collaborators = note.collaborators.filter(
    (c) => c.user.toString() !== collaboratorId
  );

  await note.save();
  await note.populate('collaborators.user', 'username email');

  res.json({
    success: true,
    message: 'Collaborator removed successfully',
    data: { note },
  });
});

export const getNoteVersions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid note ID', 400);
  }

  const note = await Note.findById(id)
    .populate('versions.modifiedBy', 'username email')
    .select('title versions owner collaborators');

  if (!note) {
    throw createError('Note not found', 404);
  }

  if (!note.isUserAuthorized(userId!, 'read')) {
    throw createError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { versions: note.versions },
  });
});