import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const password = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@blog.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@blog.com',
      password,
      role: 'admin',
      bio: '博客管理员',
    },
  });

  // Create categories
  const categories = [
    { name: '技术', slug: 'tech' },
    { name: '生活', slug: 'life' },
    { name: '随笔', slug: 'essay' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // Create tags
  const tags = [
    { name: 'JavaScript', slug: 'javascript' },
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'React', slug: 'react' },
    { name: 'Node.js', slug: 'nodejs' },
    { name: '前端', slug: 'frontend' },
    { name: '后端', slug: 'backend' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }

  // Create sample posts
  const samplePost = await prisma.post.upsert({
    where: { slug: 'hello-world' },
    update: {},
    create: {
      title: 'Hello World - 我的第一篇博客',
      slug: 'hello-world',
      content: `# 欢迎来到我的博客

这是我使用自建博客系统发布的第一篇文章。

## 功能特性

- ✨ 文章发布与编辑
- 💬 评论系统
- 🏷️ 分类与标签
- 📱 响应式设计
- 🔐 用户认证

## 技术栈

- 前端：React + TypeScript + Tailwind CSS
- 后端：Express + TypeScript
- 数据库：SQLite + Prisma ORM

感谢你的访问！`,
      summary: '这是我的第一篇博客文章，介绍博客的功能和技术栈。',
      published: true,
      authorId: admin.id,
      categoryId: (await prisma.category.findUnique({ where: { slug: 'tech' } }))!.id,
    },
  });

  // Attach tags
  const jsTag = await prisma.tag.findUnique({ where: { slug: 'javascript' } });
  const reactTag = await prisma.tag.findUnique({ where: { slug: 'react' } });
  if (jsTag && reactTag) {
    await prisma.postTag.createMany({
      data: [
        { postId: samplePost.id, tagId: jsTag.id },
        { postId: samplePost.id, tagId: reactTag.id },
      ],
    });
  }

  console.log('Seed completed!');
  console.log('Admin account: admin@blog.com / admin123');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
