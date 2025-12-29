import Link from 'next/link';


export default function Home() {
  return (
    <div className="py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-3">
          Welcome to ICT Academic System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A simple, easy-to-use platform for Grade 6 students to learn ICT.
          No email required - just your username and password!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Student Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <span className="text-green-600 text-2xl">👨‍🎓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">For Students</h2>
          </div>
          <ul className="space-y-2 mb-6 text-gray-600">
            <li>✓ View ICT learning modules</li>
            <li>✓ Watch videos & read materials</li>
            <li>✓ Take MCQ quizzes</li>
            <li>✓ See your grades instantly</li>
            <li>✓ Track your progress</li>
          </ul>
          <Link 
            href="/student" 
            className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-2 rounded-lg font-medium transition"
          >
            Student Login
          </Link>
        </div>

        {/* Teacher Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <span className="text-blue-600 text-2xl">👩‍🏫</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">For Teachers</h2>
          </div>
          <ul className="space-y-2 mb-6 text-gray-600">
            <li>✓ Monitor student progress</li>
            <li>✓ View class performance</li>
            <li>✓ Export reports to Excel</li>
            <li>✓ Identify learning gaps</li>
            <li>✓ Guide students better</li>
          </ul>
          <Link 
            href="/teacher" 
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-center py-2 rounded-lg font-medium transition"
          >
            Teacher Login
          </Link>
        </div>



        {/* Admin Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-full mr-4">
              <span className="text-purple-600 text-2xl">👨‍💼</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">For Admin</h2>
          </div>
          <ul className="space-y-2 mb-6 text-gray-600">
            <li>✓ Create ICT modules</li>
            <li>✓ Manage users & classes</li>
            <li>✓ Upload learning materials</li>
            <li>✓ System configuration</li>
            <li>✓ View all reports</li>
          </ul>
          <Link 
            href="/admin" 
            className="block w-full bg-purple-500 hover:bg-purple-600 text-white text-center py-2 rounded-lg font-medium transition"
          >
            Admin Login
          </Link>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-2xl mx-auto mt-8">
  <h3 className="font-bold text-gray-800 mb-3">Development Dashboard</h3>
  <div className="flex flex-wrap gap-3">
    <a 
      href="/test" 
      className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium"
    >
      🔧 Run Connection Tests
    </a>
    <a 
      href="http://localhost:5000/api/health" 
      target="_blank"
      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
    >
      📊 API Health Check
    </a>
    <a 
      href="http://localhost/phpmyadmin" 
      target="_blank"
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
    >
      🗄️ phpMyAdmin
    </a>
  </div>
</div>

      {/* API Status Check */}
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Frontend: Running on localhost:3000</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Backend API: Ready on localhost:5000</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">MySQL Database: Connected</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">MongoDB Atlas: Connected</span>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium text-gray-700 mb-2">Quick Links:</h4>
          <div className="flex flex-wrap gap-2">
            <a 
              href="http://localhost:5000/api/health" 
              target="_blank" 
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              API Health Check
            </a>
            <a 
              href="http://localhost/phpmyadmin" 
              target="_blank" 
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              phpMyAdmin
            </a>
            <a 
              href="https://cloud.mongodb.com" 
              target="_blank" 
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              MongoDB Atlas
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}