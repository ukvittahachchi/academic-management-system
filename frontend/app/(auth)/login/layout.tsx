import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ICT Academic System - ABC International School',
  description: 'Module-based learning management system for ICT subjects',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <div className="min-h-screen">
          {/* Simple Header */}
          <header className="bg-blue-600 text-white shadow-md">
            <div className="container mx-auto px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold">🎓 ICT Academic System</h1>
                  <p className="text-sm text-blue-100">
                    ABC International School - Grade 6
                  </p>
                </div>
                <div className="text-sm">
                  <span className="bg-blue-700 px-3 py-1 rounded-full">
                    Development Mode
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-6">
            {children}
          </main>

          {/* Simple Footer */}
          <footer className="bg-gray-800 text-white py-4 mt-8">
            <div className="container mx-auto px-4 text-center text-sm">
              <p>© 2024 ABC International School - ICT Academic System v1.0</p>
              <p className="text-gray-400 mt-1">
                Designed for Grade 6 Students • Simple & Easy to Use
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}