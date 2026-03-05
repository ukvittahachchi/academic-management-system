import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Play,
  Cpu
} from 'lucide-react';
import BackgroundVideo from '@/components/ui/BackgroundVideo';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-100 pb-8 overflow-x-hidden relative text-gray-900">
      {/* Background Video */}
      <BackgroundVideo src="/bg-video.mp4" />
      {/* Dark Overlay */}
      <div className="fixed top-0 left-0 w-full h-full bg-black/50 -z-10" />
      {/* Navbar - Kept minimal and clean */}
      <nav className="w-full pt-2 sm:pt-4 px-4 sm:px-8 mb-2 sm:mb-4">
        <div className="max-w-[95%] mx-auto flex justify-between items-center">
          {/* Left: System Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative h-10 w-10 sm:h-16 sm:w-16 flex-shrink-0 bg-white/90 rounded-full flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-sm">
              <Image
                src="/logo1.png"
                alt="Education"
                fill
                className="object-contain p-1.5 sm:p-2"
                priority
                sizes="(max-width: 640px) 40px, 64px"
              />
            </div>
            <div className="block">
              <h1 className="text-xs sm:text-lg font-bold text-white leading-tight drop-shadow-md">
                ICT Academic System
              </h1>
              <p className="text-[9px] sm:text-[10px] text-blue-300 font-bold tracking-wide drop-shadow-sm">
                FUTURE LEARNING
              </p>
            </div>
          </div>

          {/* Right: Login Button */}
          <div>
            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center px-6 py-2.5 sm:px-8 sm:py-2.5 text-sm sm:text-base font-bold text-white transition-all duration-300 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative flex items-center gap-2 drop-shadow-md tracking-wide">
                Login
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>

        </div>
      </nav>

      {/* Main Card Container */}
      <main className="flex-grow px-2 sm:px-4 md:px-8 flex items-center justify-center">
        <div className="w-full max-w-[95%] lg:max-w-6xl mx-auto relative min-h-[auto] lg:min-h-[70vh] flex items-center justify-center py-8 lg:py-0">

          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-20 relative z-10">
            <div className="flex flex-col items-center justify-center text-center space-y-8 animate-fade-in-up">

              <div className="space-y-4 sm:space-y-6 flex flex-col items-center">
                <h1
                  className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] sm:leading-[1.1] flex flex-col items-center gap-2 drop-shadow-lg"
                >
                  <span>Modular Learning &</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300 block sm:inline mt-2 sm:mt-0 drop-shadow-none">
                    Assessment Platform
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-gray-100 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-md">
                  To revolutionize the ICT academic experience by delivering a centralized, automated, and secure digital platform that empowers students, and streamlines teacher workflows.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 sm:pt-6">
                <Link
                  href="/change-password"
                  className="inline-flex items-center justify-center px-8 py-3 sm:px-10 sm:py-4 text-lg sm:text-xl font-bold text-white transition-all duration-200 bg-indigo-600 rounded-xl sm:rounded-2xl hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                >
                  Get Started
                </Link>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Footer - Balanced Design */}
      <footer className="mt-auto py-6 sm:py-8 border-t border-white/10 mt-8 backdrop-blur-md bg-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10">

            {/* Left: Organization Info */}
            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <h4 className="text-sm md:text-base font-bold text-white drop-shadow-md tracking-wide">
                National Institute of Education
              </h4>
              <div className="h-0.5 w-12 bg-indigo-500 rounded-full my-1.5 opacity-80" />
              <p className="text-xs md:text-sm text-blue-200 font-medium drop-shadow-sm mt-0.5">
                Department of Information Technology
              </p>
            </div>

            {/* Right: Techno Solutions Logo */}
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
              <div className="relative h-12 w-auto sm:h-14 hover:scale-105 transition-transform duration-300 drop-shadow-xl p-1.5 bg-white/5 rounded-xl border border-white/10">
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