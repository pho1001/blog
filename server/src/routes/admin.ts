import { Router, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { authRequired, adminRequired, AuthRequest } from '../middleware/auth';

export const adminRouter = Router();

// 所有 admin 路由都需要登录 + 管理员权限
adminRouter.use(authRequired, adminRequired);

// GET /api/admin/stats - 站点统计
adminRouter.get('/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [postCount, userCount, commentCount, publishedCount, totalViews] =
      await Promise.all([
        prisma.post.count(),
        prisma.user.count(),
        prisma.comment.count(),
        prisma.post.count({ where: { published: true } }),
        prisma.post.aggregate({ _sum: { viewCount: true } }),
      ]);

    res.json({
      postCount,
      userCount,
      commentCount,
      publishedCount,
      totalViews: totalViews._sum.viewCount || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users - 用户列表
adminRouter.get('/users', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      users: users.map((u) => ({
        ...u,
        postCount: u._count.posts,
        commentCount: u._count.comments,
        _count: undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/posts - 所有文章（含未发布的）
adminRouter.get('/posts', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        viewCount: true,
        createdAt: true,
        author: { select: { id: true, username: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      posts: posts.map((p) => ({
        ...p,
        commentCount: p._count.comments,
        _count: undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/posts/:id - 删除任意文章
adminRouter.delete('/posts/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: '文章不存在' });

    await prisma.post.delete({ where: { id } });
    res.json({ message: '文章已删除' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/comments/:id - 删除任意评论
adminRouter.delete('/comments/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ error: '评论不存在' });

    await prisma.comment.delete({ where: { id } });
    res.json({ message: '评论已删除' });
  } catch (err) {
    next(err);
  }
});
