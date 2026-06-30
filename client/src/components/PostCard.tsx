import { Link } from 'react-router-dom';
import { PostItem } from '@/lib/api';

export default function PostCard({ post }: { post: PostItem }) {
  const date = new Date(post.createdAt).toLocaleDateString('zh-CN');

  return (
    <article className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {post.coverImage && (
        <img src={post.coverImage} alt={post.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-5">
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
          {post.category && (
            <Link to={`/?category=${post.category.slug}`} className="text-blue-600 hover:underline">
              {post.category.name}
            </Link>
          )}
          <span>{date}</span>
          <span>{post.viewCount} 阅读</span>
        </div>
        <Link to={`/post/${post.slug}`}>
          <h2 className="text-lg font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>
        {post.summary && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.summary}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/?tag=${tag.slug}`}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
          <span className="text-xs text-gray-400">{post.commentCount} 评论</span>
        </div>
      </div>
    </article>
  );
}
