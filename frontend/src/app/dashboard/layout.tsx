import { ReactNode } from 'react'
import Link from 'next/link'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white p-4">
        <div className="text-xl font-bold mb-8">
          Cybin<span className="text-blue-400">AI</span>
        </div>
        
        <nav className="space-y-2">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>📥</span>
            <span>Inbox</span>
          </Link>
          <Link 
            href="/dashboard/conversations" 
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>💬</span>
            <span>Conversations</span>
          </Link>
          <Link 
            href="/dashboard/customers" 
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>👥</span>
            <span>Customers</span>
          </Link>
          <Link 
            href="/dashboard/knowledge-base" 
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>📚</span>
            <span>Knowledge Base</span>
          </Link>
          <Link 
            href="/dashboard/analytics" 
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>📊</span>
            <span>Analytics</span>
          </Link>
          
          <div className="border-t border-slate-700 my-4"></div>
          
          <Link 
            href="/admin/settings" 
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
