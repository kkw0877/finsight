import type { MonthlyTrendPoint } from "@/types/analysis";

export interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
  width?: number;
  height?: number;
  className?: string;
}

export function MonthlyTrendChart({
  data,
  width = 480,
  height = 200,
  className,
}: MonthlyTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-subtle">표시할 월별 추이 데이터가 없습니다.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const labelSpace = 24;
  const chartHeight = height - labelSpace;
  const barGap = 12;
  const barWidth = (width - barGap * (data.length - 1)) / data.length;

  return (
    <svg
      role="img"
      aria-label="월별 지출 추이 차트"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {data.map((point, index) => {
        const barHeight = (point.total / max) * chartHeight;
        const x = index * (barWidth + barGap);
        const y = chartHeight - barHeight;
        return (
          <g key={point.month}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={2} className="fill-primary" />
            <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" className="fill-ink-subtle text-xs">
              {point.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
