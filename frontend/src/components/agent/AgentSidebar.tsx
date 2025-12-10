'use client';

import { Inbox, Users, User, CheckCircle } from 'lucide-react';

interface AgentSidebarProps {
  activeView: 'all' | 'unassigned' | 'mine' | 'resolved';
  onViewChange: (view: 'all' | 'unassigned' | 'mine' | 'resolved') => void;
  conversationCounts: {
    all: number;
    unassigned: number;
    mine: number;
  };
}

export function AgentSidebar({ activeView, onViewChange, conversationCounts }: AgentSidebarProps) {
  const navItems = [
    { id: 'all' as const, label: 'All Conversations', icon: Inbox, count: conversationCounts.all },
    { id: 'unassigned' as const, label: 'Unassigned', icon: Users, count: conversationCounts.unassigned },
    { id: 'mine' as const, label: 'My Conversations', icon: User, count: conversationCounts.mine },
    { id: 'resolved' as const, label: 'Resolved', icon: CheckCircle, count: null },
  ];

  return (
    <div className="w-56 bg-[#131210] border-r border-neutral-800 text-white flex flex-col flex-shrink-0">
      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-500' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.count !== null && item.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-amber-600/30 text-amber-400' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-neutral-800">
        <div className="flex items-center space-x-2 px-3 py-2 text-sm text-neutral-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
}