import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { postsApi, categoryApi, tagApi, Category, Tag, CreatePostData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function EditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [published, setPublished] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Category/Tag management
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    categoryApi.list().then((res) => setCategories(res.categories));
    tagApi.list().then((res) => setTags(res.tags));

    if (editId) {
      postsApi.getBySlug(editId).then((data) => {
        setTitle(data.title);
        setContent(data.content);
        setSummary(data.summary || '');
        setCoverImage(data.coverImage || '');
        setCategoryId(data.category?.id);
        setSelectedTags(data.tags.map((t) => t.id));
        setPublished(data.published);
        // update id for PUT request
        (window as unknown as Record<string, number>).__editPostId = data.id;
      }).catch(() => navigate('/'));
    }
  }, [user, navigate, editId]);

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const { category } = await categoryApi.create(newCategory.trim());
      setCategories((prev) => [...prev, category]);
      setNewCategory('');
      toast.success('分类已添加');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '添加失败');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      const { tag } = await tagApi.create(newTag.trim());
      setTags((prev) => [...prev, tag]);
      setNewTag('');
      toast.success('标签已添加');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '添加失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }

    setLoading(true);
    try {
      const data: CreatePostData = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
        coverImage: coverImage || undefined,
        categoryId,
        tagIds: selectedTags,
        published,
      };

      if (editId) {
        const postId = (window as unknown as Record<string, number>).__editPostId;
        await postsApi.update(postId, data);
        toast.success('文章已更新');
      } else {
        await postsApi.create(data);
        toast.success('文章已发布');
      }
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{editId ? '编辑文章' : '写文章'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            required
            className="w-full text-2xl font-bold px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Summary + Cover */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="文章摘要（可选）"
            maxLength={500}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="封面图片URL（可选）"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category & Tags management */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => setCategoryId(undefined)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  !categoryId ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
                }`}
              >
                无分类
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    categoryId === c.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:border-blue-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="新建分类"
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(t.id) ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:border-blue-300'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="新建标签"
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">内容 (支持 Markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="使用 Markdown 格式编写文章..."
            rows={20}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? '保存中...' : published ? '更新文章' : '保存草稿'}
          </button>
          {!published && (
            <button
              type="button"
              onClick={() => { setPublished(true); }}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              发布
            </button>
          )}
          <button
            type="button"
            onClick={() => { setPublished(false); }}
            className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            存为草稿
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
