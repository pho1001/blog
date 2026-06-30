import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authRequired, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const categoryRouter = Router();

function validate(req: AuthRequest, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// GET /api/categories - 获取所有分类
categoryRouter.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { posts: { where: { published: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        postCount: c._count.posts,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories - 创建分类
categoryRouter.post(
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

      const existing = await prisma.category.findFirst({
        where: { OR: [{ name }, { slug }] },
      });
      if (existing) throw new AppError('分类已存在', 409);

      const category = await prisma.category.create({ data: { name, slug } });
      res.status(201).json({ category });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/categories/:id
categoryRouter.delete('/:id', authRequired, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new AppError('分类不存在', 404);

    await prisma.category.delete({ where: { id } });
    res.json({ message: '分类已删除' });
  } catch (err) {
    next(err);
  }
});
