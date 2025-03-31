import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  color?: "primary" | "secondary" | "accent" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressBar({
  progress,
  color = "primary",
  size = "md",
  showPercentage = false,
  className
}: ProgressBarProps) {
  const height = size === "sm" ? "h-1" 
              : size === "md" ? "h-2" 
              : "h-3";
  
  const bgColor = color === "primary" ? "bg-primary"
              : color === "secondary" ? "bg-secondary"
              : color === "accent" ? "bg-accent"
              : color === "success" ? "bg-success"
              : color === "warning" ? "bg-warning"
              : color === "error" ? "bg-error"
              : "bg-primary";
  
  return (
    <div className={cn("w-full bg-neutral-100 rounded-full", height, className)}>
      <div 
        className={cn("rounded-full", height, bgColor)} 
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      >
        {showPercentage && (
          <span className="sr-only">{progress}% Complete</span>
        )}
      </div>
    </div>
  );
}
