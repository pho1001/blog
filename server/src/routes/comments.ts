import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authRequired, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const commentRouter = Router();

function validate(req: AuthRequest, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

const commentSelect = {
  id: true,
  content: true,
  authorId: true,
  parentId: true,
  createdAt: true,
  author: { select: { id: true, username: true, avatar: true } },
};

// GET /api/comments/post/:postId - 获取文章评论
commentRouter.get('/post/:postId', async (req, res: Response, next) => {
  try {
    const postId = parseInt(req.params.postId);
    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      select: {
        ...commentSelect,
        replies: {
          select: commentSelect,
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

// POST /api/comments - 创建评论
commentRouter.post(
  '/',
  optionalAuth,
  [body('content').trim().isLength({ min: 1, max: 2000 }).escape(), body('postId').isInt(), body('parentId').optional().isInt()],
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!validate(req, res)) return;
      if (!req.userId) throw new AppError('请先登录再评论', 401);

      const { content, postId, parentId } = req.body;

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post || !post.published) throw new AppError('文章不存在', 404);

      if (parentId) {
        const parent = await prisma.comment.findUnique({ where: { id: parentId } });
        if (!parent || parent.postId !== postId) throw new AppError('父评论不存在', 404);
      }

      const comment = await prisma.comment.create({
        data: { content: content.trim(), postId, parentId: parentId || null, authorId: req.userId },
        select: commentSelect,
      });

      res.status(201).json({ comment });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/comments/:id - 删除评论
commentRouter.delete('/:id', authRequired, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = parseInt(req.params.id);
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new AppError('评论不存在', 404);
    if (comment.authorId !== req.userId) throw new AppError('无权删除此评论', 403);

    await prisma.comment.delete({ where: { id } });
    res.json({ message: '评论已删除' });
  } catch (err) {
    next(err);
  }
});
