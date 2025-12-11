'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  BookOpen,
  MessageSquare,
  Users,
  BarChart3,
  Link2,
  Settings,
  LogOut,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  disabled?: boolean
  isActive?: boolean
}

function NavItem({ href, icon, label, disabled = false, isActive = false }: NavItemProps) {
  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-500 cursor-not-allowed">
        <span className="w-5 h-5 opacity-50">{icon}</span>
        <span className="text-sm">{label}</span>
        <span className="ml-auto text-[10px] font-medium bg-neutral-700/50 text-neutral-500 px-1.5 py-0.5 rounded">
          Soon
        </span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-amber-600/20 text-amber-400' 
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
        }
      `}
    >
      <span className={`w-5 h-5 ${isActive ? 'text-amber-500' : ''}`}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[#1A1915]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#131210] border-r border-neutral-800 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-800">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Cybin<span className="text-amber-500">AI</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem
            href="/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Overview"
            isActive={isActive('/dashboard') && !pathname.includes('/analytics')}
          />
          <NavItem
            href="/agent"
            icon={<Inbox size={20} />}
            label="Agent Inbox"
            isActive={isActive('/agent')}
          />
          <NavItem
            href="/admin/knowledge-base"
            icon={<BookOpen size={20} />}
            label="Knowledge Base"
            isActive={isActive('/admin/knowledge-base')}
          />
          <NavItem
            href="/dashboard/analytics"
            icon={<BarChart3 size={20} />}
            label="Analytics"
            isActive={isActive('/dashboard/analytics')}
          />
          <NavItem
            href="/demo/widget"
            icon={<MessageSquare size={20} />}
            label="Widget Demo"
            isActive={isActive('/demo/widget')}
          />

          {/* Divider */}
          <div className="my-4 border-t border-neutral-800" />

          {/* Coming Soon Section */}
          <p className="px-3 py-2 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
            Coming Soon
          </p>
          <NavItem
            href="#"
            icon={<Users size={20} />}
            label="Customers"
            disabled
          />
          <NavItem
            href="#"
            icon={<Link2 size={20} />}
            label="Integrations"
            disabled
          />
          <NavItem
            href="#"
            icon={<Settings size={20} />}
            label="Settings"
            disabled
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800">
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors">
            <LogOut size={20} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}