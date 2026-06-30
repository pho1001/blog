const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败 (${res.status})`);
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () =>
    request<{ user: User }>('/auth/me'),
};

// Posts
export const postsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PostsResponse>(`/posts${qs}`);
  },
  getBySlug: (slug: string) =>
    request<PostDetail>(`/posts/${slug}`),
  create: (data: CreatePostData) =>
    request<{ post: { id: number; slug: string } }>('/posts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreatePostData>) =>
    request<{ post: { id: number; slug: string } }>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ message: string }>(`/posts/${id}`, { method: 'DELETE' }),
};

// Categories & Tags
export const categoryApi = {
  list: () => request<{ categories: Category[] }>('/categories'),
  create: (name: string) =>
    request<{ category: Category }>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: number) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),
};

export const tagApi = {
  list: () => request<{ tags: Tag[] }>('/tags'),
  create: (name: string) =>
    request<{ tag: Tag }>('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: number) =>
    request<{ message: string }>(`/tags/${id}`, { method: 'DELETE' }),
};

// Comments
export const commentApi = {
  getByPost: (postId: number) =>
    request<{ comments: Comment[] }>(`/comments/post/${postId}`),
  create: (data: { postId: number; content: string; parentId?: number }) =>
    request<{ comment: Comment }>('/comments', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ message: string }>(`/comments/${id}`, { method: 'DELETE' }),
};

// Admin
export const adminApi = {
  stats: () => request<AdminStats>('/admin/stats'),
  users: () => request<{ users: AdminUser[] }>('/admin/users'),
  posts: () => request<{ posts: AdminPost[] }>('/admin/posts'),
  deletePost: (id: number) =>
    request<{ message: string }>(`/admin/posts/${id}`, { method: 'DELETE' }),
  deleteComment: (id: number) =>
    request<{ message: string }>(`/admin/comments/${id}`, { method: 'DELETE' }),
};

// Types
export interface User {
  id: number; username: string; email: string;
  avatar: string | null; bio: string | null; role: string;
}

export interface Category {
  id: number; name: string; slug: string; postCount: number;
}

export interface Tag {
  id: number; name: string; slug: string; postCount: number;
}

export interface PostItem {
  id: number; title: string; slug: string; summary: string | null;
  coverImage: string | null; published: boolean; viewCount: number;
  createdAt: string; updatedAt: string;
  author: { id: number; username: string; avatar: string | null };
  category: { id: number; name: string; slug: string } | null;
  tags: Tag[]; commentCount: number;
}

export interface PostDetail extends PostItem {
  content: string;
}

export interface PostsResponse {
  posts: PostItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface Comment {
  id: number; content: string; createdAt: string;
  authorId: number | null; parentId: number | null;
  author: { id: number; username: string; avatar: string | null } | null;
  replies: Comment[];
}

export interface CreatePostData {
  title: string; content: string; summary?: string;
  coverImage?: string; categoryId?: number;
  tagIds?: number[]; published?: boolean;
}

export interface AdminStats {
  postCount: number; userCount: number; commentCount: number;
  publishedCount: number; totalViews: number;
}

export interface AdminUser extends User {
  postCount: number; commentCount: number; createdAt: string;
}

export interface AdminPost {
  id: number; title: string; slug: string; published: boolean;
  viewCount: number; createdAt: string;
  author: { id: number; username: string };
  category: { id: number; name: string } | null;
  commentCount: number;
}
