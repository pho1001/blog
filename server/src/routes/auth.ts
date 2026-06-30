import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authRequired, generateToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

function validate(req: AuthRequest, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// POST /api/auth/register
authRouter.post(
  '/register',
  [
    body('username').trim().isLength({ min: 2, max: 30 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6, max: 100 }),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!validate(req, res)) return;
      const { username, email, password } = req.body;

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });
      if (existingUser) {
        throw new AppError('用户名或邮箱已被注册', 409);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, email, password: hashedPassword },
      });

      const token = generateToken(user.id);
      res.status(201).json({
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!validate(req, res)) return;
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AppError('邮箱或密码错误', 401);
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new AppError('邮箱或密码错误', 401);
      }

      const token = generateToken(user.id);
      res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
authRouter.get('/me', authRequired, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, avatar: true, bio: true, role: true, createdAt: true },
    });
    if (!user) {
      throw new AppError('用户不存在', 404);
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
