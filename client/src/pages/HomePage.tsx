import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postsApi, PostItem, PostsResponse } from '@/lib/api';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Pick<PostsResponse, 'posts' | 'pagination'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page) };
    if (category) params.category = category;
    if (tag) params.tag = tag;
    if (searchQuery) params.search = searchQuery;

    postsApi.list(params)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [page, category, tag, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(search ? { search } : {});
  };

  const currentFilter = category ? `分类: ${category}` : tag ? `标签: ${tag}` : searchQuery ? `搜索: ${searchQuery}` : '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文章..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            搜索
          </button>
        </div>
      </form>

      {currentFilter && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-gray-500">{currentFilter}</span>
          <button
            onClick={() => setSearchParams({})}
            className="text-sm text-blue-600 hover:underline"
          >
            清除筛选
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : data && data.posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.posts.map((post: PostItem) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={(p) => {
              const params = new URLSearchParams(searchParams);
              params.set('page', String(p));
              setSearchParams(params);
            }}
          />
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">暂无文章</p>
          <p className="text-sm mt-2">成为第一个发布文章的人吧！</p>
        </div>
      )}
    </div>
  );
}
