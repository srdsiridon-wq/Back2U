import { MapPin } from "lucide-react";

import { buildingName, findFloorPlan } from "@/lib/back2u/data";
import type { ItemLocation } from "@/lib/back2u/types";
import { cn } from "@/lib/utils";

/**
 * Illustrated indoor floor plan for the Back2U prototype.
 * Highlights the single room where an item was found or last seen.
 */
export function FloorPlan({
  location,
  label = "เจอที่นี่",
}: {
  location: ItemLocation;
  label?: string;
}) {
  const plan = findFloorPlan(location);
  if (!plan) return null;

  const target = location.room?.toLowerCase();

  return (
    <figure className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">
          {buildingName(plan.building)} — {plan.floor}
        </span>
        <span className="text-xs text-muted-foreground">ผังภายในอาคาร</span>
      </figcaption>

      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl border border-border bg-secondary sm:aspect-[16/9]">
        {plan.spaces.map((space, index) => {
          const isTarget = !!target && space.label.toLowerCase() === target;
          const isCorridor = space.kind === "corridor";

          return (
            <div
              key={`${space.label}-${index}`}
              style={{
                left: `${space.x}%`,
                top: `${space.y}%`,
                width: `${space.w}%`,
                height: `${space.h}%`,
              }}
              className={cn(
                "absolute flex flex-col items-center justify-center rounded-lg border text-center",
                isCorridor && "border-dashed border-border bg-background/70",
                !isCorridor && !isTarget && "border-border bg-card",
                isTarget &&
                  "animate-pin-pop border-primary bg-primary text-primary-foreground shadow-lift ring-4 ring-primary/20",
              )}
            >
              {isTarget && <MapPin className="mb-0.5 h-4 w-4" aria-hidden="true" />}
              <span
                className={cn(
                  "px-1 text-[10px] font-semibold leading-tight sm:text-xs",
                  isCorridor && "font-medium uppercase tracking-wide text-muted-foreground",
                  !isCorridor && !isTarget && "text-muted-foreground",
                )}
              >
                {space.label}
              </span>
              {isTarget && (
                <span className="text-[9px] font-medium uppercase tracking-wide opacity-90 sm:text-[10px]">
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </figure>
  );
}
