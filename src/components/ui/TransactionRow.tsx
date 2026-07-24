import type { Transaction } from "@/types/transaction";
import { Tag } from "./Tag";

export interface TransactionRowProps {
  transaction: Transaction;
  className?: string;
}

export function TransactionRow({ transaction, className }: TransactionRowProps) {
  const { date, merchant, category, amount } = transaction;
  const classes = [
    "flex items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="flex items-center gap-4">
        <span className="font-mono text-[15px] leading-[1.4] font-medium text-ink-subtle tabular-nums">
          {date}
        </span>
        <span className="text-base text-ink">{merchant}</span>
        <Tag>{category}</Tag>
      </div>
      <span className="font-mono text-[15px] leading-[1.4] font-medium text-ink tabular-nums">
        {amount.toLocaleString("ko-KR")}
      </span>
    </div>
  );
}
