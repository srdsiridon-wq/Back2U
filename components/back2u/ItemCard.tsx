import { Link } from "@tanstack/react-router";
import { MapPin, Clock } from "lucide-react";

import { formatDate, locationLabel } from "@/lib/back2u/data";
import { categoryTh, colorTh, statusTh } from "@/lib/back2u/i18n";
import type { Item } from "@/lib/back2u/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: Item["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "found" ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
      )}
    >
      {statusTh(status)}
    </span>
  );
}

export function MatchBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground",
        className,
      )}
    >
      ตรงกัน {score}%
    </span>
  );
}

export function ItemCard({
  item,
  score,
  query,
}: {
  item: Item;
  score?: number | undefined;
  query?: string | undefined;
}) {
  return (
    <Link
      to="/item/$itemId"
      params={{ itemId: item.id }}
      search={{ q: query || undefined }}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-lift"
    >
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        width={800}
        height={800}
        className="h-24 w-24 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-semibold">{item.name}</h3>
          {typeof score === "number" ? (
            <MatchBadge score={score} />
          ) : (
            <StatusBadge status={item.status} />
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {categoryTh(item.category)} · {colorTh(item.color)}
          {typeof score === "number" ? ` · ${statusTh(item.status)}` : ""}
        </p>
        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{locationLabel(item.location)}</span>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {formatDate(item.date)}
        </p>
      </div>
    </Link>
  );
}
