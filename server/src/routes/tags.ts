import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authRequired, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const tagRouter = Router();

function validate(req: AuthRequest, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// GET /api/tags - 获取所有标签
tagRouter.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { posts: { where: { post: { published: true } } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        postCount: t._count.posts,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tags - 创建标签
tagRouter.post(
  '/',
  authRequired,
  [body('name').trim().isLength({ min: 1, max: 50 }).escape()],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!validate(req, res)) return;
      const name = req.body.name.trim();
      const slug = name
        .toLowerCase()
        .replace(/[\s]+/g, '-')
        .replace(/[^\w\u4e00-\u9fff-]/g, '');

      const existing = await prisma.tag.findFirst({
        where: { OR: [{ name }, { slug }] },
      });
      if (existing) throw new AppError('标签已存在', 409);

      const tag = await prisma.tag.create({ data: { name, slug } });
      res.status(201).json({ tag });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/tags/:id
tagRouter.delete('/:id', authRequired, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new AppError('标签不存在', 404);

    await prisma.tag.delete({ where: { id } });
    res.json({ message: '标签已删除' });
  } catch (err) {
    next(err);
  }
});
