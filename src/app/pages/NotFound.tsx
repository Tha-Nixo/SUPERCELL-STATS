import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0B0F1A] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-[100px] leading-none mb-6 opacity-20" aria-hidden="true">🏰</div>
        <h1 className="text-5xl font-extrabold text-white mb-3">404</h1>
        <p className="text-white/70 mb-8">This page doesn't exist. The village you're looking for may have been raided.</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center min-h-11 gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-semibold hover:bg-white/15 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
