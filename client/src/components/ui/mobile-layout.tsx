import { Link } from "wouter";
import { useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  currentPath: string;
}

export default function MobileLayout({ children, currentPath }: MobileLayoutProps) {
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

      {/* Bottom Navigation Bar - Fixed */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-300 px-6 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10 h-[60px] flex items-center">
        <div className="flex justify-between items-center w-full">
          <Link href="/">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center relative rounded-lg transition-all duration-200",
              isActive("/") ? "cursor-default" : "hover:bg-neutral-100"
            )}>
              <i className={cn(
                isActive("/") ? "fas fa-home" : "far fa-home",
                "text-lg transition-transform",
                isActive("/") ? "text-black" : "text-gray-600"
              )}></i>
              <span className={cn(
                "text-xs mb-1",
                isActive("/") ? "text-black font-medium" : "text-gray-600"
              )}>Home</span>
            </a>
          </Link>
          
          <Link href="/portfolio">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center relative rounded-lg transition-all duration-200",
              isActive("/portfolio") ? "cursor-default" : "hover:bg-neutral-100"
            )}>
              <i className={cn(
                isActive("/portfolio") ? "fas fa-project-diagram" : "far fa-project-diagram",
                "text-lg transition-transform",
                isActive("/portfolio") ? "text-black" : "text-gray-600"
              )}></i>
              <span className={cn(
                "text-xs mb-1",
                isActive("/portfolio") ? "text-black font-medium" : "text-gray-600"
              )}>Portfolio</span>
            </a>
          </Link>
          
          <Link href="/risk">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center relative rounded-lg transition-all duration-200",
              isActive("/risk") ? "cursor-default" : "hover:bg-neutral-100"
            )}>
              <i className={cn(
                isActive("/risk") ? "fas fa-plus-circle" : "fas fa-plus",
                "text-lg transition-transform",
                isActive("/risk") ? "text-black" : "text-gray-600"
              )}></i>
              <span className={cn(
                "text-xs mb-1",
                isActive("/risk") ? "text-black font-medium" : "text-gray-600"
              )}>Risk</span>
            </a>
          </Link>
          
          <Link href="/stress-test">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center relative rounded-lg transition-all duration-200",
              isActive("/stress-test") ? "cursor-default" : "hover:bg-neutral-100"
            )}>
              <i className={cn(
                isActive("/stress-test") ? "fas fa-heartbeat" : "far fa-heartbeat",
                "text-lg transition-transform",
                isActive("/stress-test") ? "text-black" : "text-gray-600"
              )}></i>
              <span className={cn(
                "text-xs mb-1",
                isActive("/stress-test") ? "text-black font-medium" : "text-gray-600"
              )}>Stress Test</span>
            </a>
          </Link>
          
          <Link href="/profile">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center relative rounded-lg transition-all duration-200",
              isActive("/profile") ? "cursor-default" : "hover:bg-neutral-100"
            )}>
              <i className={cn(
                isActive("/profile") ? "fas fa-user" : "far fa-user",
                "text-lg transition-transform",
                isActive("/profile") ? "text-black" : "text-gray-600"
              )}></i>
              <span className={cn(
                "text-xs mb-1",
                isActive("/profile") ? "text-black font-medium" : "text-gray-600"
              )}>Profile</span>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
