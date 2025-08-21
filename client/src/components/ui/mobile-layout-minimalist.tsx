import { Link } from "wouter";
import { useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  currentPath: string;
}

export default function MobileLayoutMinimalist({ children, currentPath }: MobileLayoutProps) {
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="mx-auto max-w-md border border-neutral-300 rounded-3xl overflow-hidden shadow-lg bg-white min-h-[812px] relative">
      {/* Status Bar */}
      <div className="bg-white px-6 pt-4 pb-2 flex justify-between items-center">
        <div className="text-sm font-medium">
          {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </div>
        <div className="flex space-x-2">
          <i className="fas fa-signal"></i>
          <i className="fas fa-wifi"></i>
          <i className="fas fa-battery-three-quarters"></i>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="h-[700px] overflow-y-auto pb-16">
        {children}
      </div>

      {/* Bottom Navigation Bar - Fixed - Minimalist Design */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#FAFAF8] px-6 z-10 h-[60px] flex items-center py-3">
        <div className="flex justify-between items-center w-full">
          <Link href="/">
            <a className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
              "hover:bg-neutral-100"
            )}>
              <i className="fas fa-smile text-lg text-black"></i>
            </a>
          </Link>
          
          <Link href="/portfolio">
            <a className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
              "hover:bg-neutral-100"
            )}>
              <i className="fas fa-sun text-lg text-black"></i>
            </a>
          </Link>
          
          <Link href="/risk">
            <a className={cn(
              "w-16 h-16 flex items-center justify-center rounded-full transition-all duration-200",
              "bg-black text-white shadow-lg hover:shadow-xl"
            )}
            style={{ 
              boxShadow: '0 0 20px rgba(0, 255, 170, 0.3)'
            }}>
              <i className="fas fa-star text-lg text-white"></i>
            </a>
          </Link>
          
          <Link href="/stress-test">
            <a className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
              "hover:bg-neutral-100"
            )}>
              <i className="fas fa-chart-bar text-lg text-black"></i>
            </a>
          </Link>
          
          <Link href="/profile">
            <a className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
              "hover:bg-neutral-100"
            )}>
              <i className="fas fa-user text-lg text-black"></i>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
