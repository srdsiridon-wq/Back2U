import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, Sparkles, X } from "lucide-react";

import { listMatchesForItem } from "@/lib/back2u/items.functions";
import { CONFIDENCE_LABEL } from "@/lib/back2u/matching/types";

/**
 * Owner-facing suggestions: "รายการนี้อาจตรงกับของคุณ".
 * Scores are recommendations only — the claim workflow decides ownership.
 */
export function MatchSuggestions({ itemId }: { itemId: string }) {
  const fetchMatches = useServerFn(listMatchesForItem);
  const matches = useQuery({
    queryKey: ["matches", itemId],
    queryFn: () => fetchMatches({ data: { itemId } }),
    staleTime: 60_000,
  });

  if (!matches.data?.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {matches.data.map(({ item, outcome }) => (
        <Link
          key={item.id}
          to="/item/$itemId"
          params={{ itemId: item.id }}
          search={{ q: undefined }}
          className="block rounded-2xl border border-primary/30 bg-primary-soft/40 p-3 transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold">
              ตรงกัน {outcome.score}% · {CONFIDENCE_LABEL[outcome.confidence]}
            </p>
          </div>
          <p className="mt-1 text-sm">{item.name}</p>
          {outcome.signals.length > 0 && (
            <ul className="mt-2 space-y-1">
              {outcome.signals
                .filter((signal) => signal.weight > 0)
                .slice(0, 4)
                .map((signal) => (
                  <li key={signal.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {signal.hit ? (
                      <Check className="size-3.5 text-primary" aria-hidden="true" />
                    ) : (
                      <X className="size-3.5 opacity-50" aria-hidden="true" />
                    )}
                    {signal.label}
                  </li>
                ))}
            </ul>
          )}
        </Link>
      ))}
    </div>
  );
}
