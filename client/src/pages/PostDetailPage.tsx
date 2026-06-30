import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { postsApi, commentApi, PostDetail, Comment } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    postsApi.getBySlug(slug)
      .then((data) => {
        setPost(data);
        if (data.published) {
          commentApi.getByPost(data.id).then((res) => setComments(res.comments));
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('请先登录'); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { comment } = await commentApi.create({ postId: post!.id, content: commentText.trim() });
      if (!comment.parentId) {
        setComments((prev) => [comment, ...prev]);
      }
      setCommentText('');
      toast.success('评论成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!user) { toast.error('请先登录'); return; }
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const { comment } = await commentApi.create({
        postId: post!.id,
        content: replyText.trim(),
        parentId,
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...c.replies, comment] } : c
        )
      );
      setReplyTo(null);
      setReplyText('');
      toast.success('回复成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !confirm('确定要删除这篇文章吗？')) return;
    try {
      await postsApi.delete(post.id);
      toast.success('文章已删除');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!post) return null;

  const date = new Date(post.createdAt).toLocaleDateString('zh-CN');
  const isAuthor = user?.id === post.author.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article>
        {/* Cover */}
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} className="w-full h-64 md:h-80 object-cover rounded-xl mb-8" />
        )}

        {/* Meta */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span>{post.author.username}</span>
            <span>{date}</span>
            <span>{post.viewCount} 阅读</span>
            {post.category && (
              <Link to={`/?category=${post.category.slug}`} className="text-blue-600 hover:underline">
                {post.category.name}
              </Link>
            )}
            {isAuthor && (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => navigate(`/editor?id=${post.id}`)}
                  className="text-blue-600 hover:underline"
                >
                  编辑
                </button>
                <button onClick={handleDeletePost} className="text-red-600 hover:underline">
                  删除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/?tag=${tag.slug}`}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose bg-white rounded-xl p-6 md:p-10 shadow-sm">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>

      {/* Comments Section */}
      <section className="mt-12">
        <h2 className="text-xl font-bold mb-6">
          评论 ({post.commentCount})
        </h2>

        {/* Comment form */}
        {user ? (
          <form onSubmit={handleComment} className="mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="写下你的评论..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? '提交中...' : '发表评论'}
            </button>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
            <Link to="/login" className="text-blue-600 hover:underline">登录</Link>后参与评论
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">
                  {comment.author?.username || '匿名用户'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <p className="text-gray-700">{comment.content}</p>
              {user && (
                <button
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="text-xs text-gray-400 hover:text-blue-600 mt-2 transition-colors"
                >
                  {replyTo === comment.id ? '取消' : '回复'}
                </button>
              )}
              {replyTo === comment.id && (
                <div className="mt-3 ml-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="写下回复..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={submitting || !replyText.trim()}
                    className="mt-1 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    回复
                  </button>
                </div>
              )}
              {/* Replies */}
              {comment.replies?.length > 0 && (
                <div className="mt-4 ml-6 space-y-3 border-l-2 border-gray-100 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {reply.author?.username || '匿名用户'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(reply.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
