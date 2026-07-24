import type { Category } from "@/types/transaction";
import type { CategoryTotal } from "@/types/analysis";

/**
 * ADR-010: 앰버(primary)는 CTA 전용 포인트 컬러라 카테고리 식별에 재사용하지 않는다.
 * dataviz 스킬의 검증된 기본 8색 카테고리 팔레트(고정 순서)를 dark 모드 bg-surface 대비로
 * 검증해 8개 실카테고리에 배정하고, "기타"는 9번째 합성 색상 대신 중립 회색(text-neutral)을 쓴다.
 */
export const CATEGORY_COLORS: Record<Category, string> = {
  식비: "#3987e5",
  교통: "#d95926",
  주거_공과금: "#199e70",
  쇼핑: "#c98500",
  의료_건강: "#d55181",
  구독서비스: "#008300",
  여가_문화: "#9085e9",
  저축_투자: "#e66767",
  기타: "#787a7f",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  식비: "식비",
  교통: "교통",
  주거_공과금: "주거·공과금",
  쇼핑: "쇼핑",
  의료_건강: "의료·건강",
  구독서비스: "구독서비스",
  여가_문화: "여가·문화",
  저축_투자: "저축·투자",
  기타: "기타",
};

export interface DonutChartProps {
  categoryTotals: CategoryTotal[];
  size?: number;
  className?: string;
}

export function DonutChart({ categoryTotals, size = 200, className }: DonutChartProps) {
  if (categoryTotals.length === 0) {
    return <p className="text-sm text-ink-subtle">표시할 지출 내역이 없습니다.</p>;
  }

  const radius = size / 2;
  const strokeWidth = size * 0.18;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  const total = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  let cumulative = 0;

  return (
    <div className={["flex flex-wrap items-center gap-6", className].filter(Boolean).join(" ")}>
      <svg
        role="img"
        aria-label="카테고리별 지출 비중 도넛차트"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {categoryTotals.map((entry) => {
            const fraction = total === 0 ? 0 : entry.total / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={entry.category}
                cx={radius}
                cy={radius}
                r={innerRadius}
                fill="none"
                stroke={CATEGORY_COLORS[entry.category]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
      </svg>
      <ul className="flex flex-col gap-2">
        {categoryTotals.map((entry) => (
          <li key={entry.category} className="flex items-center gap-2 text-sm text-ink-muted">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[entry.category] }}
            />
            <span>{CATEGORY_LABELS[entry.category]}</span>
            <span className="font-mono text-[15px] leading-[1.4] font-medium text-ink tabular-nums">
              {entry.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
