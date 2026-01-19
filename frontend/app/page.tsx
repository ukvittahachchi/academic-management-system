import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Play,
  Cpu
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans selection:bg-indigo-100 pb-8 overflow-x-hidden">
      {/* Navbar - Kept minimal and clean */}
      <nav className="w-full pt-2 sm:pt-4 px-4 sm:px-8 mb-2 sm:mb-4">
        <div className="max-w-[95%] mx-auto flex justify-between items-center">
          {/* Left: System Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative h-10 w-10 sm:h-16 sm:w-16 flex-shrink-0">
              <Image
                src="/3logo.png"
                alt="Ministry of Education"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="block">
              <h1 className="text-xs sm:text-lg font-bold text-gray-800 leading-tight">
                ICT Academic System
              </h1>
              <p className="text-[9px] sm:text-[10px] text-blue-600 font-bold tracking-wide">
                FUTURE LEARNING
              </p>
            </div>
          </div>

          {/* Right: Login Button */}
          <div>
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 px-5 py-1.5 sm:px-6 sm:py-2.5 bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 rounded-full font-bold text-xs sm:text-base transition-all duration-200"
            >
              <span>Login</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Card Container */}
      <main className="flex-grow px-2 sm:px-4 md:px-8 flex items-center justify-center">
        <div className="w-full max-w-[95%] mx-auto bg-white rounded-3xl lg:rounded-[3rem] overflow-hidden relative min-h-[auto] lg:min-h-[70vh] flex items-center shadow-2xl shadow-indigo-100/50 border border-gray-100 py-8 lg:py-0">

          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 lg:w-96 lg:h-96 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 lg:w-96 lg:h-96 bg-blue-50 rounded-full blur-3xl opacity-60"></div>
          </div>

          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-20 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

              {/* Left Side: Content */}
              <div className="flex flex-col text-center lg:text-left space-y-6 lg:space-y-8 animate-fade-in-up">
                <div className="space-y-3 sm:space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] sm:leading-[1.1]">
                    Modular Learning & <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 block sm:inline mt-2 sm:mt-0">
                      Assessment Platform
                    </span>
                  </h1>
                  <p className="text-base sm:text-lg text-gray-700 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    To revolutionize the academic experience by delivering a centralized, automated, and secure digital platform that empowers students, streamlines teacher workflows, and provides administrators with data-driven control over curriculum and performance.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2 sm:pt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-8 py-3 sm:px-10 sm:py-4 text-lg sm:text-xl font-bold text-white transition-all duration-200 bg-indigo-600 rounded-xl sm:rounded-2xl hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                  >
                    Get Started
                  </Link>
                </div>
              </div>

              {/* Right Side: Video */}
              <div className="relative w-full flex items-center justify-center lg:justify-end mt-8 lg:mt-0">
                <div className="relative w-full max-w-[280px] sm:max-w-md lg:max-w-lg aspect-square">
                  {/* Video Container - No border, just clean */}
                  <div className="w-full h-full rounded-2xl lg:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-200/50 transform hover:scale-[1.02] transition-transform duration-500 bg-gray-900 border-4 border-white relative">
                    <video
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                    >
                      <source src="/hero.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  {/* Optional: Floating Elements around video to match style */}
                  <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full animate-float blur-sm opacity-60"></div>
                  <div className="absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-8 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full animate-float animation-delay-2000 blur-sm opacity-60"></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Footer - Centered */}
      <footer className="mt-8 sm:mt-12 mb-4 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">

            {/* Ministry Logo */}
            <div className="flex flex-col items-center">
              <div className="relative h-12 w-auto sm:h-16 mb-2">
                <Image
                  src="/sri-lanka-state-logo-png_seeklogo-365182-removebg-preview.png"
                  alt="Ministry of Education"
                  width={64}
                  height={64}
                  className="h-full w-auto object-contain"
                />
              </div>
            </div>

            {/* Middle Text */}
            <div className="text-center">
              <h4 className="text-sm sm:text-base font-bold text-gray-900">
                National Institute of Education
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">
                Department of Information Technology
              </p>
            </div>

            {/* Techno Solutions Logo */}
            <div className="flex flex-col items-center">
              <div className="relative h-12 w-auto sm:h-16 mb-2">
                <Image
                  src="/images-removebg-preview.png"
                  alt="Techno Solutions"
                  width={64}
                  height={64}
                  className="h-full w-auto object-contain"
                />
              </div>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}