import React, { useState, useRef } from 'react';

export interface DataPoint {
  label: string;
  value: number;
  value2?: number;
  tooltipExtra?: string;
}

interface AreaChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  series1Name?: string;
  series1Color?: string;
  series2Name?: string;
  series2Color?: string;
  unit?: string;
  maxValue?: number;
  formatValue?: (val: number) => string;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  title,
  subtitle,
  height = 200,
  series1Name = 'Value',
  series1Color = '#10b981', // emerald-500
  series2Name,
  series2Color = '#06b6d4', // cyan-500
  unit = '',
  maxValue: explicitMax,
  formatValue
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500"
        style={{ height }}
      >
        No chart data available
      </div>
    );
  }

  const padding = { top: 20, right: 15, bottom: 25, left: 45 };
  const width = 600; // viewBox width for SVG scaling

  // Calculate scales
  const vals1 = data.map((d) => d.value);
  const vals2 = data.filter((d) => d.value2 !== undefined).map((d) => d.value2 as number);
  const allVals = [...vals1, ...vals2];

  const maxVal = explicitMax !== undefined ? explicitMax : Math.max(...allVals, 1) * 1.1;
  const minVal = 0;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (data.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + chartH - ((clamped - minVal) / (maxVal - minVal)) * chartH;
  };

  // Generate SVG path for series 1
  const points1 = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const linePath1 = `M ${points1.join(' L ')}`;
  const areaPath1 = `${linePath1} L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;

  // Generate SVG path for series 2 if present
  let linePath2 = '';
  let areaPath2 = '';
  if (series2Name && vals2.length > 0) {
    const points2 = data.map((d, i) => `${getX(i)},${getY(d.value2 || 0)}`);
    linePath2 = `M ${points2.join(' L ')}`;
    areaPath2 = `${linePath2} L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;
  }

  // Hover calculation
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = (clientX - (padding.left / width) * rect.width) / ((chartW / width) * rect.width);
    const index = Math.round(ratio * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  const displayFormat = (v: number) => {
    if (formatValue) return formatValue(v);
    return `${v.toLocaleString()}${unit ? ` ${unit}` : ''}`;
  };

  // Y-axis ticks (4 ticks)
  const yTicks = [
    { val: maxVal, y: padding.top },
    { val: (maxVal + minVal) / 2, y: padding.top + chartH / 2 },
    { val: minVal, y: padding.top + chartH }
  ];

  // X-axis ticks (5 labels evenly spaced)
  const xTickIndices = [
    0,
    Math.floor((data.length - 1) * 0.25),
    Math.floor((data.length - 1) * 0.5),
    Math.floor((data.length - 1) * 0.75),
    data.length - 1
  ];

  const uid = React.useId().replace(/:/g, '');

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          {title && <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>}
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series1Color }} />
            <span className="text-zinc-400">{series1Name}:</span>
            <span className="font-mono font-medium text-zinc-200">
              {activePoint ? displayFormat(activePoint.value) : '-'}
            </span>
          </div>

          {series2Name && activePoint?.value2 !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series2Color }} />
              <span className="text-zinc-400">{series2Name}:</span>
              <span className="font-mono font-medium text-zinc-200">
                {displayFormat(activePoint.value2)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={`grad1-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series1Color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={series1Color} stopOpacity="0.0" />
            </linearGradient>
            {series2Name && (
              <linearGradient id={`grad2-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series2Color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={series2Color} stopOpacity="0.0" />
              </linearGradient>
            )}
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + chartW}
                y2={tick.y}
                stroke="#27272a"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-zinc-500 font-mono text-[10px]"
              >
                {Math.round(tick.val)}
                {unit ? unit : ''}
              </text>
            </g>
          ))}

          {/* Area and Line Series 2 */}
          {series2Name && areaPath2 && (
            <>
              <path d={areaPath2} fill={`url(#grad2-${uid})`} />
              <path d={linePath2} fill="none" stroke={series2Color} strokeWidth="2" strokeLinecap="round" />
            </>
          )}

          {/* Area and Line Series 1 */}
          <path d={areaPath1} fill={`url(#grad1-${uid})`} />
          <path d={linePath1} fill="none" stroke={series1Color} strokeWidth="2" strokeLinecap="round" />

          {/* X Axis Time Labels */}
          {xTickIndices.map((idx) => {
            const point = data[idx];
            if (!point) return null;
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 5}
                textAnchor="middle"
                className="fill-zinc-500 font-mono text-[10px]"
              >
                {point.label}
              </text>
            );
          })}

          {/* Hover Crosshair & Dots */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + chartH}
                stroke="#71717a"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].value)}
                r="4.5"
                fill={series1Color}
                stroke="#09090b"
                strokeWidth="2"
              />
              {series2Name && data[hoverIndex].value2 !== undefined && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(data[hoverIndex].value2 || 0)}
                  r="4.5"
                  fill={series2Color}
                  stroke="#09090b"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>

        {hoverIndex !== null && (
          <div
            className="pointer-events-none absolute -top-8 rounded-md bg-zinc-800/90 px-2 py-1 font-mono text-[10px] text-zinc-300 shadow-md backdrop-blur-md"
            style={{
              left: `${(getX(hoverIndex) / width) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            {data[hoverIndex].label}
          </div>
        )}
      </div>
    </div>
  );
};
