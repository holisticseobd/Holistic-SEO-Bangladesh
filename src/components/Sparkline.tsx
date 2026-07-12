import React from 'react';

interface SparklineProps {
  data: number[];
}

export default function Sparkline({ data }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  const width = 64;
  const height = 18;
  const padding = 2;
  
  const points = data.map((val, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const first = data[0];
  const last = data[data.length - 1];
  const percentChange = first === 0 ? 0 : ((last - first) / first) * 100;
  const isUp = percentChange >= 0;

  return (
    <div className="flex items-center justify-end gap-2" id="sparkline-container">
      <svg width={width} height={height} className="overflow-visible inline-block" id="sparkline-svg">
        <polyline
          fill="none"
          stroke={isUp ? '#10b981' : '#ef4444'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle
          cx={padding + (width - padding * 2)}
          cy={height - padding - ((last - min) / range) * (height - padding * 2)}
          r="1.5"
          fill={isUp ? '#34d399' : '#f87171'}
        />
      </svg>
      <span className={`text-[9.5px] font-mono font-bold w-12 text-right ${isUp ? 'text-emerald-400' : 'text-rose-400'}`} id="sparkline-percent">
        {isUp ? '+' : ''}{percentChange.toFixed(0)}%
      </span>
    </div>
  );
}
