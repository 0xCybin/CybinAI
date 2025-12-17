'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Settings,
  BarChart3,
  Users,
  UserCog,
  Link2,
  LogOut,
  Inbox,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isActive
          ? 'bg-amber-500/10 text-amber-500'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-[#1A1915]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#131210] border-r border-neutral-800 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-lg font-bold text-white">MykoDesk</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <NavItem
            href="/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Overview"
            isActive={pathname === '/dashboard'}
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

          {/* Admin Section */}
          <p className="px-3 py-2 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
            Admin
          </p>
          <NavItem
            href="/admin/customers"
            icon={<Users size={20} />}
            label="Customers"
            isActive={isActive('/admin/customers')}
          />
          <NavItem
            href="/admin/users"
            icon={<UserCog size={20} />}
            label="Team"
            isActive={isActive('/admin/users')}
          />
          <NavItem
            href="/admin/integrations"
            icon={<Link2 size={20} />}
            label="Integrations"
            isActive={isActive('/admin/integrations')}
          />
          <NavItem
            href="/admin/settings"
            icon={<Settings size={20} />}
            label="Settings"
            isActive={isActive('/admin/settings')}
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
          >
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