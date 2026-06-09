import React, { useState, useMemo } from 'react';

const BTRChart = ({ data, currentDelta }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const svgWidth = 500;
  const svgHeight = 130;
  const paddingX = 40;
  const paddingY = 15;
  
  const plotWidth = svgWidth - 2 * paddingX;
  const plotHeight = svgHeight - 2 * paddingY;

  // Calculate coordinates for all points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort data by delta
    const sorted = [...data].sort((a, b) => a.delta - b.delta);
    
    return sorted.map(p => {
      const x = paddingX + ((p.delta - (-60)) / 120) * plotWidth;
      const y = paddingY + plotHeight - (p.score / 100) * plotHeight;
      return {
        ...p,
        x,
        y
      };
    });
  }, [data, plotWidth, plotHeight]);

  // Generate path string for area fill under the curve
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const startX = points[0].x;
    const startY = paddingY + plotHeight;
    const path = points.map(p => `L ${p.x} ${p.y}`).join(' ');
    const endX = points[points.length - 1].x;
    const endY = paddingY + plotHeight;
    return `M ${startX} ${startY} ${path} L ${endX} ${endY} Z`;
  }, [points, plotHeight]);

  // Generate path string for stroke line
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  // Find X coordinate for current delta
  const currentX = useMemo(() => {
    return paddingX + ((currentDelta - (-60)) / 120) * plotWidth;
  }, [currentDelta, plotWidth]);

  // Interpolate current delta's Y position
  const currentY = useMemo(() => {
    if (points.length === 0) return paddingY + plotHeight;
    const match = points.find(p => p.delta === currentDelta);
    if (match) return match.y;
    // Fallback to closest point
    const closest = points.reduce((prev, curr) => 
      Math.abs(curr.delta - currentDelta) < Math.abs(prev.delta - currentDelta) ? curr : prev
    , points[0]);
    return closest.y;
  }, [points, currentDelta, plotHeight]);

  return (
    <div className="w-full bg-slate-50/60 border border-slate-100 rounded-xl p-3 shadow-inner relative select-none">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id="chartCurveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#f1f5f9" strokeWidth="1.5" />
        <line x1={paddingX} y1={paddingY + plotHeight / 2} x2={svgWidth - paddingX} y2={paddingY + plotHeight / 2} stroke="#f1f5f9" strokeWidth="1.5" />
        <line x1={paddingX} y1={paddingY + plotHeight} x2={svgWidth - paddingX} y2={paddingY + plotHeight} stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Y-Axis Labels */}
        <text x={paddingX - 8} y={paddingY + 3} textAnchor="end" className="fill-slate-400 text-[8.5px] font-mono font-bold">100%</text>
        <text x={paddingX - 8} y={paddingY + plotHeight / 2 + 3} textAnchor="end" className="fill-slate-400 text-[8.5px] font-mono font-bold">50%</text>
        <text x={paddingX - 8} y={paddingY + plotHeight + 3} textAnchor="end" className="fill-slate-400 text-[8.5px] font-mono font-bold">0%</text>

        {/* X-Axis Labels */}
        <text x={paddingX} y={svgHeight - 1} textAnchor="middle" className="fill-slate-400 text-[8.5px] font-mono font-bold">-60m</text>
        <text x={paddingX + plotWidth / 2} y={svgHeight - 1} textAnchor="middle" className="fill-slate-400 text-[8.5px] font-mono font-bold">0m (Birth)</text>
        <text x={paddingX + plotWidth} y={svgHeight - 1} textAnchor="middle" className="fill-slate-400 text-[8.5px] font-mono font-bold">+60m</text>

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#chartCurveGradient)" />}

        {/* Line stroke */}
        {linePath && <path d={linePath} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Vertical line for current delta */}
        <line x1={currentX} y1={paddingY} x2={currentX} y2={paddingY + plotHeight} stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3,3" />

        {/* Interactive dots and hover hitboxes */}
        {points.map((p, idx) => {
          const isHovered = hoveredPoint && hoveredPoint.delta === p.delta;
          const isCurrent = p.delta === currentDelta;
          
          return (
            <g key={idx}>
              {/* Invisible larger hitbox circle for easy mouse hovering */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="10" 
                fill="transparent" 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* Visible dot indicator */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r={isHovered ? 5 : isCurrent ? 3.5 : 2} 
                fill={isHovered ? '#3b82f6' : isCurrent ? '#2563eb' : '#b45309'} 
                stroke={isHovered || isCurrent ? '#ffffff' : 'none'} 
                strokeWidth={1.5}
                className="transition-all duration-150 pointer-events-none"
              />
            </g>
          );
        })}

        {/* Current delta marker circle */}
        {currentX && (
          <circle 
            cx={currentX} 
            cy={currentY} 
            r="5" 
            fill="#2563eb" 
            stroke="#ffffff" 
            strokeWidth="1.5" 
            className="animate-pulse pointer-events-none" 
          />
        )}
      </svg>

      {/* Floating Tooltip inside the card */}
      {hoveredPoint && (
        <div 
          className="absolute bg-slate-900/95 text-white border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xl text-[10px] font-sans leading-none pointer-events-none transition-all duration-100 z-50 shrink-0"
          style={{ 
            left: `${((hoveredPoint.delta - (-60)) / 120) * 76 + 8}%`, 
            top: `${(1 - hoveredPoint.score / 100) * 55 + 5}%` 
          }}
        >
          <div className="font-bold text-amber-300">Shift: {hoveredPoint.delta}m</div>
          <div className="text-[9px] text-slate-350 mt-1">Confidence: <span className="font-bold text-emerald-400">{hoveredPoint.score}%</span></div>
        </div>
      )}
    </div>
  );
};

export default BTRChart;
