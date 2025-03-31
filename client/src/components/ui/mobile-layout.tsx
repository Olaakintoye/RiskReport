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
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 px-6">
        <div className="flex justify-between">
          <Link href="/">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center",
              isActive("/") && "cursor-default"
            )}>
              <i className={cn(
                "fas fa-home",
                isActive("/") ? "text-primary" : "text-neutral-400"
              )}></i>
              <span className={cn(
                "text-xs mt-1",
                isActive("/") ? "text-primary font-medium" : "text-neutral-400"
              )}>Home</span>
            </a>
          </Link>
          
          <Link href="/marketplace">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center",
              isActive("/marketplace") && "cursor-default"
            )}>
              <i className={cn(
                "fas fa-store",
                isActive("/marketplace") ? "text-primary" : "text-neutral-400"
              )}></i>
              <span className={cn(
                "text-xs mt-1",
                isActive("/marketplace") ? "text-primary font-medium" : "text-neutral-400"
              )}>Explore</span>
            </a>
          </Link>
          
          <Link href="/portfolio">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center",
              isActive("/portfolio") && "cursor-default"
            )}>
              <i className={cn(
                "fas fa-chart-pie",
                isActive("/portfolio") ? "text-primary" : "text-neutral-400"
              )}></i>
              <span className={cn(
                "text-xs mt-1",
                isActive("/portfolio") ? "text-primary font-medium" : "text-neutral-400"
              )}>Portfolio</span>
            </a>
          </Link>
          
          <Link href="/account">
            <a className={cn(
              "py-2 px-3 flex flex-col items-center",
              isActive("/account") && "cursor-default"
            )}>
              <i className={cn(
                "fas fa-user",
                isActive("/account") ? "text-primary" : "text-neutral-400"
              )}></i>
              <span className={cn(
                "text-xs mt-1",
                isActive("/account") ? "text-primary font-medium" : "text-neutral-400"
              )}>Account</span>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
