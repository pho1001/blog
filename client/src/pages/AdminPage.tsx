import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, AdminStats, AdminUser, AdminPost } from '@/lib/api';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'stats' | 'users' | 'posts'>('stats');

  // 非管理员重定向
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading || !user) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (user.role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">管理后台</h1>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6 border-b">
        {([
          ['stats', '概览'],
          ['users', '用户管理'],
          ['posts', '文章管理'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'posts' && <PostsTab />}
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    adminApi.stats().then(setStats).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-500">{err}</p>;
  if (!stats) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {([
        ['文章总数', stats.postCount],
        ['已发布', stats.publishedCount],
        ['用户数', stats.userCount],
        ['评论数', stats.commentCount],
        ['总访问量', stats.totalViews],
      ] as const).map(([label, value]) => (
        <div key={label} className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{value}</div>
          <div className="text-sm text-gray-500 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    adminApi.users()
      .then(({ users }) => setUsers(users))
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-500">{err}</p>;
  if (!users.length) return <p className="text-gray-500">暂无用户</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white border rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户名</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">邮箱</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">角色</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">文章</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">评论</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">注册时间</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{u.id}</td>
              <td className="px-4 py-3 text-sm font-medium">{u.username}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {u.role === 'admin' ? '管理员' : '用户'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{u.postCount}</td>
              <td className="px-4 py-3 text-sm">{u.commentCount}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(u.createdAt).toLocaleDateString('zh-CN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostsTab() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [err, setErr] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    adminApi.posts()
      .then(({ posts }) => setPosts(posts))
      .catch((e) => setErr(e.message));
  };

  useEffect(load, []);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`确定删除文章「${title}」？`)) return;
    setDeleting(id);
    try {
      await adminApi.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '删除失败';
      alert(msg);
    } finally {
      setDeleting(null);
    }
  };

  if (err) return <p className="text-red-500">{err}</p>;
  if (!posts.length) return <p className="text-gray-500">暂无文章</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white border rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">标题</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">作者</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">浏览</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">评论</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {posts.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{p.id}</td>
              <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">{p.title}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{p.author.username}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  p.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {p.published ? '已发布' : '草稿'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{p.viewCount}</td>
              <td className="px-4 py-3 text-sm">{p.commentCount}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(p.createdAt).toLocaleDateString('zh-CN')}
              </td>
              <td className="px-4 py-3 text-sm">
                <button
                  onClick={() => handleDelete(p.id, p.title)}
                  disabled={deleting === p.id}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {deleting === p.id ? '删除中...' : '删除'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
