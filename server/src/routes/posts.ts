import { Router, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authRequired, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const postRouter = Router();

function validate(req: AuthRequest, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-');
}

const postSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  coverImage: true,
  published: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, username: true, avatar: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
  _count: { select: { comments: true } },
};

// GET /api/posts - 文章列表（公开）
postRouter.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('category').optional().isString(),
    query('tag').optional().isString(),
    query('search').optional().isString(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!validate(req, res)) return;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { published: true };

      if (req.query.category) {
        where.category = { slug: req.query.category as string };
      }
      if (req.query.tag) {
        where.tags = { some: { tag: { slug: req.query.tag as string } } };
      }
      if (req.query.search) {
        where.OR = [
          { title: { contains: req.query.search as string } },
          { summary: { contains: req.query.search as string } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          select: postSelect,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.post.count({ where }),
      ]);

      res.json({
        posts: posts.map((p) => ({
          ...p,
          tags: p.tags.map((t) => t.tag),
          commentCount: p._count.comments,
          _count: undefined,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/posts/:slug - 文章详情（公开）
postRouter.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.post.update({
      where: { slug: req.params.slug },
      data: { viewCount: { increment: 1 } },
      select: {
        ...postSelect,
        content: true,
      },
    });

    if (!post) throw new AppError('文章不存在', 404);
    if (!post.published && post.author.id !== req.userId) {
      throw new AppError('文章不存在', 404);
    }

    res.json({
      ...post,
      tags: post.tags.map((t) => t.tag),
      commentCount: post._count.comments,
      _count: undefined,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts - 创建文章
postRouter.post(
  '/',
  authRequired,
  [
    body('title').trim().isLength({ min: 1, max: 200 }).escape(),
    body('content').isLength({ min: 1 }),
    body('summary').optional().trim().isLength({ max: 500 }).escape(),
    body('coverImage').optional().isURL(),
    body('categoryId').optional().isInt(),
    body('tagIds').optional().isArray(),
    body('published').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!validate(req, res)) return;
      const { title, content, summary, coverImage, categoryId, tagIds, published } = req.body;

      let slug = slugify(title);
      const existing = await prisma.post.findUnique({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const post = await prisma.post.create({
        data: {
          title: title.trim(),
          slug,
          content,
          summary: summary?.trim(),
          coverImage,
          categoryId: categoryId || null,
          published: published ?? false,
          authorId: req.userId!,
          tags: tagIds?.length
            ? { create: tagIds.map((tagId: number) => ({ tagId })) }
            : undefined,
        },
        select: { id: true, title: true, slug: true },
      });

      res.status(201).json({ post });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/posts/:id - 更新文章
postRouter.put(
  '/:id',
  authRequired,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }).escape(),
    body('summary').optional().trim().isLength({ max: 500 }).escape(),
    body('coverImage').optional({ values: 'null' }).isURL(),
    body('categoryId').optional({ values: 'null' }),
    body('tagIds').optional().isArray(),
    body('published').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!validate(req, res)) return;
      const postId = parseInt(req.params.id);
      const post = await prisma.post.findUnique({ where: { id: postId } });

      if (!post) throw new AppError('文章不存在', 404);
      if (post.authorId !== req.userId) throw new AppError('无权修改此文章', 403);

      const { content, title, summary, coverImage, categoryId, tagIds, published } = req.body;
      const data: Record<string, unknown> = {};
      if (content !== undefined) data.content = content;
      if (title !== undefined) { data.title = title.trim(); data.slug = slugify(title.trim()); }
      if (summary !== undefined) data.summary = summary?.trim();
      if (coverImage !== undefined) data.coverImage = coverImage;
      if (categoryId !== undefined) data.categoryId = categoryId;
      if (published !== undefined) data.published = published;

      if (tagIds !== undefined) {
        await prisma.postTag.deleteMany({ where: { postId } });
        if (tagIds.length) {
          await prisma.postTag.createMany({
            data: tagIds.map((tagId: number) => ({ postId, tagId })),
          });
        }
      }

      const updated = await prisma.post.update({
        where: { id: postId },
        data,
        select: { id: true, title: true, slug: true },
      });

      res.json({ post: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/posts/:id - 删除文章
postRouter.delete('/:id', authRequired, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) throw new AppError('文章不存在', 404);
    if (post.authorId !== req.userId) throw new AppError('无权删除此文章', 403);

    await prisma.post.delete({ where: { id: postId } });
    res.json({ message: '文章已删除' });
  } catch (err) {
    next(err);
  }
});
