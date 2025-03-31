import { useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface ChartSegment {
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: ChartSegment[];
  total: number;
  centerLabel?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function DonutChart({
  segments,
  total,
  centerLabel,
  size = 150,
  strokeWidth = 10,
  className = "",
}: DonutChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear any existing paths
    const svg = svgRef.current;
    const existingPaths = svg.querySelectorAll("path");
    existingPaths.forEach(path => path.remove());
    
    // Calculate total for percentages
    const totalValue = segments.reduce((sum, segment) => sum + segment.value, 0);
    if (totalValue === 0) return;
    
    // SVG parameters
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Draw segments
    let startAngle = 0;
    
    segments.forEach(segment => {
      const segmentPercentage = segment.value / totalValue;
      const arcLength = segmentPercentage * circumference;
      const endAngle = startAngle + (segmentPercentage * 2 * Math.PI);
      
      // Calculate path
      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);
      
      const largeArcFlag = segmentPercentage > 0.5 ? 1 : 0;
      
      // Create SVG path
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `);
      path.setAttribute("fill", segment.color);
      
      svg.appendChild(path);
      
      startAngle = endAngle;
    });
  }, [segments, size, strokeWidth]);
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg 
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Segments will be added by useEffect */}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-neutral-500">Total</span>
        <span className="font-mono font-bold">{formatCurrency(total)}</span>
        {centerLabel && <span className="text-xs mt-1">{centerLabel}</span>}
      </div>
    </div>
  );
}
