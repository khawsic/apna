import React from 'react';

interface AudioWaveProps {
  active: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  bars?: number;
}

export const AudioWave: React.FC<AudioWaveProps> = ({
  active,
  color = 'bg-indigo-600',
  size = 'md',
  bars = 5,
}) => {
  const heightClasses = {
    sm: 'h-3 w-0.5',
    md: 'h-5 w-1',
    lg: 'h-7 w-1.5',
  };

  const heights = [0.4, 0.9, 0.6, 1.0, 0.5, 0.8, 0.3];

  return (
    <div className="flex items-center gap-1 h-7 px-1">
      {Array.from({ length: bars }).map((_, i) => {
        const baseH = heights[i % heights.length];
        return (
          <span
            key={i}
            className={`${heightClasses[size]} ${color} rounded-full transition-all duration-150 inline-block`}
            style={{
              height: active ? `${Math.max(20, baseH * 100)}%` : '20%',
              animation: active ? `pulseWave 0.8s ease-in-out infinite alternate ${i * 0.12}s` : 'none',
            }}
          />
        );
      })}
      <style>{`
        @keyframes pulseWave {
          0% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
          100% { transform: scaleY(0.4); }
        }
      `}</style>
    </div>
  );
};
