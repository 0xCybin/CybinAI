'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password, subdomain);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitting = loading || authLoading;

  return (
    <div className="min-h-screen bg-[#1A1915] flex items-center justify-center p-4">
      <div className="bg-[#232220] rounded-xl border border-neutral-800 shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-neutral-100">
            Cybin<span className="text-amber-500">AI</span>
          </Link>
          <h1 className="text-xl font-semibold text-neutral-100 mt-4">Welcome back</h1>
          <p className="text-neutral-400">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-neutral-300 mb-1">
              Business Subdomain
            </label>
            <div className="flex items-center">
              <input
                type="text"
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2.5 bg-[#1A1915] border border-neutral-700 rounded-l-lg text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-colors"
                placeholder="acmehvac"
                required
                disabled={isSubmitting}
              />
              <span className="px-3 py-2.5 bg-neutral-800 border border-l-0 border-neutral-700 rounded-r-lg text-neutral-500 text-sm">
                .cybinai.com
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1A1915] border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-colors"
              placeholder="you@company.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1A1915] border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-colors"
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="rounded border-neutral-600 bg-neutral-800 text-amber-500 focus:ring-amber-500/50" 
                disabled={isSubmitting}
              />
              <span className="ml-2 text-sm text-neutral-400">Remember me</span>
            </label>
            <Link href="/auth/forgot-password" className="text-sm text-amber-500 hover:text-amber-400">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-medium hover:bg-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-amber-500 hover:text-amber-400 font-medium">
            Start free trial
          </Link>
        </p>

        {/* Dev Helper - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <p className="text-xs text-neutral-500 mb-2">Dev: Test credentials</p>
            <button
              type="button"
              onClick={() => {
                setSubdomain('acmehvac');
                setEmail('test@acmehvac.com');
                setPassword('TestPassword123!');
              }}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              Fill test credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
}