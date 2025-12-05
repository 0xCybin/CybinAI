'use client';

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
    { id: 'all' as const, label: 'All Conversations', icon: InboxIcon, count: conversationCounts.all },
    { id: 'unassigned' as const, label: 'Unassigned', icon: QueueIcon, count: conversationCounts.unassigned },
    { id: 'mine' as const, label: 'My Conversations', icon: UserIcon, count: conversationCounts.mine },
    { id: 'resolved' as const, label: 'Resolved', icon: CheckIcon, count: null },
  ];

  return (
    <div className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0">
      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {item.count !== null && item.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-500' : 'bg-slate-700'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
}

// Simple icon components
function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
