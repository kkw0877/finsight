import {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  HeartPulse,
  Repeat,
  Film,
  PiggyBank,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/components/DonutChart";
import type { Category } from "@/types/transaction";

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  식비: Utensils,
  교통: Car,
  주거_공과금: Home,
  쇼핑: ShoppingBag,
  의료_건강: HeartPulse,
  구독서비스: Repeat,
  여가_문화: Film,
  저축_투자: PiggyBank,
  기타: Shapes,
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export function CategoryIconGrid() {
  return (
    <section>
      <h2 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
        9가지 카테고리로 자동 분류됩니다
      </h2>
      <p className="mt-2 text-sm text-ink-subtle">
        거래 내역을 사람이 직접 태그하지 않아도 자동으로 정리됩니다.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          return (
            <Card key={category} className="flex flex-row items-center gap-3">
              <Icon aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-ink-muted" />
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[category] }}
              />
              <span className="text-sm text-ink">{CATEGORY_LABELS[category]}</span>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
