import mongoose, { Schema, Document } from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Collaborator:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *           description: User ID of the collaborator
 *         role:
 *           type: string
 *           enum: [read, write]
 *           description: Permission level of the collaborator
 *         addedAt:
 *           type: string
 *           format: date-time
 *     
 *     NoteVersion:
 *       type: object
 *       properties:
 *         content:
 *           type: string
 *           description: Previous version content
 *         modifiedBy:
 *           type: string
 *           description: User ID who made the change
 *         modifiedAt:
 *           type: string
 *           format: date-time
 *     
 *     Note:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - owner
 *       properties:
 *         _id:
 *           type: string
 *           description: Note unique identifier
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Note title
 *         content:
 *           type: string
 *           description: Note content
 *         owner:
 *           type: string
 *           description: User ID of the note owner
 *         collaborators:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Collaborator'
 *         versions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/NoteVersion'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

interface ICollaborator {
  user: mongoose.Types.ObjectId;
  role: 'read' | 'write';
  addedAt: Date;
}

interface INoteVersion {
  content: string;
  modifiedBy: mongoose.Types.ObjectId;
  modifiedAt: Date;
}

export interface INote extends Document {
  title: string;
  content: string;
  owner: mongoose.Types.ObjectId;
  collaborators: ICollaborator[];
  versions: INoteVersion[];
  createdAt: Date;
  updatedAt: Date;
  isUserAuthorized(userId: string, requiredRole?: 'read' | 'write'): boolean;
  addVersion(content: string, modifiedBy: string): void;
}

const collaboratorSchema = new Schema<ICollaborator>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['read', 'write'],
    required: true,
    default: 'read',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const versionSchema = new Schema<INoteVersion>({
  content: {
    type: String,
    required: true,
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  modifiedAt: {
    type: Date,
    default: Date.now,
  },
});

const noteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [collaboratorSchema],
    versions: [versionSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
noteSchema.index({ owner: 1 });
noteSchema.index({ 'collaborators.user': 1 });
noteSchema.index({ title: 'text', content: 'text' });

// Instance method to check user authorization
noteSchema.methods.isUserAuthorized = function (
  userId: string,
  requiredRole: 'read' | 'write' = 'read'
): boolean {
  // Owner has full access
  if (this.owner.toString() === userId) {
    return true;
  }

  // Check collaborator permissions
  const collaborator = this.collaborators.find(
    (c: ICollaborator) => c.user.toString() === userId
  );

  if (!collaborator) {
    return false;
  }

  // If read access is required, both read and write roles are allowed
  if (requiredRole === 'read') {
    return true;
  }

  // If write access is required, only write role is allowed
  return collaborator.role === 'write';
};

// Instance method to add a version when content changes
noteSchema.methods.addVersion = function (content: string, modifiedBy: string): void {
  // Only add version if content actually changed
  if (this.content !== content) {
    this.versions.push({
      content: this.content,
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      modifiedAt: new Date(),
    });

    // Limit version history to last 50 versions
    if (this.versions.length > 50) {
      this.versions = this.versions.slice(-50);
    }
  }
};

export default mongoose.model<INote>('Note', noteSchema);