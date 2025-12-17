'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, Lock, Building2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-[#0F0E0C] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative bg-[#1A1915] rounded-2xl border border-neutral-800 shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-neutral-100">
            Myko<span className="text-amber-500">Desk</span>
          </Link>
          <h1 className="text-xl font-semibold text-neutral-100 mt-6">Welcome back</h1>
          <p className="text-neutral-400 mt-1">Sign in to your account</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subdomain */}
          <div>
            <label
              htmlFor="subdomain"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Business Subdomain
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                required
                placeholder="acmehvac"
                className="w-full pl-12 pr-32 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                .mykodesk.com
              </span>
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-neutral-500 hover:text-amber-500 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-neutral-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/register"
            className="text-amber-500 hover:text-amber-400 font-medium"
          >
            Start free trial
          </Link>
        </p>

        {/* Dev Helper - Keep until production */}
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