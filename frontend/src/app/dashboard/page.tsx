export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="text-gray-600">Manage your customer conversations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500">Open Tickets</div>
          <div className="text-2xl font-bold text-gray-900">12</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500">AI Handled Today</div>
          <div className="text-2xl font-bold text-green-600">24</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500">Avg. Response Time</div>
          <div className="text-2xl font-bold text-blue-600">1.2s</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500">Resolution Rate</div>
          <div className="text-2xl font-bold text-purple-600">78%</div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              All
            </button>
            <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-full text-sm">
              Open
            </button>
            <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-full text-sm">
              Pending
            </button>
            <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-full text-sm">
              Resolved
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
          <p className="text-gray-500 mb-4">
            When customers start chatting, their conversations will appear here.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Set up your chat widget
          </button>
        </div>

        {/* Sample Conversation Row (commented out - will show when data exists) */}
        {/*
        <div className="p-4 border-b hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">JD</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">John Doe</div>
                <div className="text-sm text-gray-500">AC not cooling properly...</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">2 min ago</div>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                AI Handled
              </span>
            </div>
          </div>
        </div>
        */}
      </div>
    </div>
  )
}
