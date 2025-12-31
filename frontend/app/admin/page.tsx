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

        {/* You can add more cards here in the future (e.g., Manage Users) */}
      </div>

      {/* Placeholder for future features */}
      <div className="text-center py-10 border-t border-gray-200">
        <div className="text-4xl mb-4 grayscale opacity-50">👨‍💼</div>
        <h2 className="text-lg font-semibold text-gray-500 mb-2">
          More Admin Features Coming Soon
        </h2>
        <p className="text-gray-400 text-sm">
          User management and Analytics will be available in Week 5.
        </p>
      </div>
    </div>
  );
}