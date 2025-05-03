import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      res.status(400).json({
        success: false,
        message: `Validation Error: ${message}`,
      });
      return;
    }
    
    next();
  };
};

// Validation schemas
export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const createNoteSchema = Joi.object({
  title: Joi.string().max(200).required(),
  content: Joi.string().allow('').default(''),
});

export const updateNoteSchema = Joi.object({
  title: Joi.string().max(200),
  content: Joi.string().allow(''),
}).min(1);

export const addCollaboratorSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('read', 'write').default('read'),
});