import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
          📝 我的博客
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">首页</Link>
          {user ? (
            <>
              <Link to="/editor" className="text-gray-600 hover:text-blue-600 transition-colors">写文章</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 transition-colors">管理</Link>
              )}
              <span className="text-gray-400">{user.username}</span>
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 transition-colors">退出</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-blue-600 transition-colors">登录</Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">注册</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t px-4 py-3 space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-gray-600">首页</Link>
          {user ? (
            <>
              <Link to="/editor" onClick={() => setMenuOpen(false)} className="block text-gray-600">写文章</Link>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="block text-gray-600">管理后台</Link>
              )}
              <span className="block text-gray-400">{user.username}</span>
              <button onClick={handleLogout} className="block text-gray-500">退出</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-gray-600">登录</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block text-gray-600">注册</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
