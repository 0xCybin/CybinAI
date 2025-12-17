'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Building2, User, Mail, Lock, Globe, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate subdomain from business name
  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    // Only auto-generate if subdomain hasn't been manually edited
    if (!subdomain || subdomain === businessName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setSubdomain(value.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (subdomain.length < 3) {
      setError('Subdomain must be at least 3 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          tenant_name: businessName,
          tenant_subdomain: subdomain,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      // Store tokens
      localStorage.setItem('access_token', data.tokens.access_token);
      localStorage.setItem('refresh_token', data.tokens.refresh_token);

      // Use window.location for full page reload so AuthContext picks up the tokens
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

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
          <h1 className="text-xl font-semibold text-neutral-100 mt-6">
            Start your free trial
          </h1>
          <p className="text-neutral-400 mt-1">
            14 days free • No credit card required
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Your Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
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
                minLength={8}
                placeholder="Min. 8 characters"
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
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#1A1915] text-neutral-500">
                Business Details
              </span>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label
              htmlFor="businessName"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Business Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                id="businessName"
                value={businessName}
                onChange={(e) => handleBusinessNameChange(e.target.value)}
                required
                placeholder="Acme HVAC Services"
                className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Subdomain */}
          <div>
            <label
              htmlFor="subdomain"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Your URL
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                id="subdomain"
                value={subdomain}
                onChange={(e) =>
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                required
                minLength={3}
                placeholder="acmehvac"
                className="w-full pl-12 pr-32 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                .mykodesk.com
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-1.5">
              Letters, numbers, and hyphens only
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-neutral-400">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-amber-500 hover:text-amber-400 font-medium"
          >
            Sign in
          </Link>
        </p>

        {/* Terms */}
        <p className="mt-4 text-center text-xs text-neutral-600">
          By creating an account, you agree to our{' '}
          <Link href="#" className="text-neutral-500 hover:text-neutral-400">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="#" className="text-neutral-500 hover:text-neutral-400">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}