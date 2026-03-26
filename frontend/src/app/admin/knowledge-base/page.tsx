'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import { Plus, Search, Edit, Trash2, BookOpen, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:8000';

interface KBArticle {
  id: string;
  title: string;
  category: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export default function KnowledgeBasePage() {
  const { isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();
  
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const url = searchQuery 
        ? `${API_URL}/api/v1/knowledge-base/articles?search=${encodeURIComponent(searchQuery)}`
        : `${API_URL}/api/v1/knowledge-base/articles`;
      
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch articles');
      
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, getAuthHeaders]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchArticles();
    }
  }, [isAuthenticated, fetchArticles]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/knowledge-base/articles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) throw new Error('Failed to delete article');
      
      await fetchArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete article');
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
            <p className="text-zinc-400 mt-1">Your AI uses these articles to answer customer questions. The more you add, the smarter it gets.</p>
          </div>
          <Link
            href="/admin/knowledge-base/new"
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Article
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
          </div>
        )}

        {/* Articles List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-7 h-7 text-zinc-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Your knowledge base is empty</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
              Add articles about your services, pricing, and common questions. Your AI uses this to answer customers accurately.
            </p>
            <Link
              href="/admin/knowledge-base/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Article
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Category</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Updated</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <span className="font-medium text-zinc-200">{article.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-400">{article.category || 'General'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        article.published 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {article.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(article.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/knowledge-base/${article.id}/edit`}
                          className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}