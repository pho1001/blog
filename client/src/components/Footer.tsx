export default function Footer() {
  return (
    <footer className="bg-white border-t mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} 我的博客 - Powered by React + Express</p>
      </div>
    </footer>
  );
}
