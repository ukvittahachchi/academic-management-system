import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2">Admin Portal</h1>
        <p>Manage the entire system - users, modules, content, and settings.</p>
      </div>

      {/* Dashboard Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Manage Modules Card */}
        <Link
          href="/admin/modules"
          className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition border border-purple-200 block"
        >
          <div className="text-4xl mb-4 text-purple-600">📚</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Manage Modules</h3>
          <p className="text-gray-600">Create and organize learning modules</p>
        </Link>

        {/* Manage Users Card */}
        <Link
          href="/admin/users"
          className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition border border-blue-200 block"
        >
          <div className="text-4xl mb-4 text-blue-600">👥</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Manage Users</h3>
          <p className="text-gray-600">Add, edit, or remove users and roles</p>
        </Link>

        {/* Audit Logs Card */}
        <Link
          href="/admin/audit-logs"
          className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition border border-amber-200 block"
        >
          <div className="text-4xl mb-4 text-amber-600">📋</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Audit Logs</h3>
          <p className="text-gray-600">View system activity and security logs</p>
        </Link>

        {/* Settings Card */}
        <Link
          href="/admin/settings"
          className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition border border-gray-200 block"
        >
          <div className="text-4xl mb-4 text-gray-600">⚙️</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">System Settings</h3>
          <p className="text-gray-600">Configure global system preferences</p>
        </Link>
      </div>

      {/* Footer / Version Info */}
      <div className="text-center py-10 border-t border-gray-200">
        <p className="text-gray-400 text-sm">
          System version 1.1 - Advanced Admin Panel Enabled
        </p>
      </div>
    </div>
  );
}