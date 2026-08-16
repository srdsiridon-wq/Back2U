import { Check, Info, X } from "lucide-react";

import type { MatchReason } from "@/lib/back2u/match";
import { STRONG_MATCH_THRESHOLD } from "@/lib/back2u/match";
import { cn } from "@/lib/utils";

export function MatchReasonList({
  reasons,
  className,
}: {
  reasons: MatchReason[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">
        ทำไมถึงคิดว่าตรงกัน
      </p>
      <ul className="mt-2 space-y-1.5">
        {reasons.map((reason) => (
          <li key={reason.label} className="flex items-start gap-2 text-sm">
            {reason.hit ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={reason.hit ? "text-foreground" : "text-muted-foreground"}>
              {reason.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchExplainer({
  score,
  reasons,
  compact = false,
  className,
}: {
  score: number;
  reasons: MatchReason[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/25 bg-primary-soft",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-accent-foreground">
            {score >= STRONG_MATCH_THRESHOLD ? "น่าจะใช่ชิ้นนี้" : "ตรงกันบางส่วน"}
          </p>
          <p
            className={cn(
              "mt-1 font-bold text-accent-foreground",
              compact ? "text-2xl" : "text-3xl",
            )}
          >
            ตรงกัน {score}%
          </p>
        </div>
      </div>

      <MatchReasonList reasons={reasons} className="mt-4" />

      {!compact && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          คะแนนนี้เป็นเพียงต้นแบบ Back2U เทียบข้อความที่คุณพิมพ์กับรายละเอียดของสิ่งของ
          อย่าลืมตรวจสอบของด้วยตัวเองก่อนรับคืน
        </p>
      )}
    </section>
  );
}
