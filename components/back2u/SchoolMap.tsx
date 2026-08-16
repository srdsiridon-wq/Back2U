import {
  BookOpen,
  Dumbbell,
  FlaskConical,
  MapPin,
  Music,
  School,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { BUILDINGS } from "@/lib/back2u/data";
import type { BuildingId } from "@/lib/back2u/types";
import { cn } from "@/lib/utils";

const ICONS: Record<BuildingId, LucideIcon> = {
  main: School,
  science: FlaskConical,
  library: BookOpen,
  gym: Dumbbell,
  cafeteria: UtensilsCrossed,
  arts: Music,
  field: Trees,
};

export function SchoolMap({ highlight }: { highlight?: BuildingId | undefined }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-secondary sm:aspect-[4/3]">
      {/* Campus pathways */}
      <div className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 border-y border-dashed border-border bg-background/80" />
      <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 border-x border-dashed border-border bg-background/80" />

      {BUILDINGS.map((building) => {
        const active = building.id === highlight;
        const Icon = ICONS[building.id];
        return (
          <div
            key={building.id}
            style={{
              left: `${building.x}%`,
              top: `${building.y}%`,
              width: `${building.w}%`,
              height: `${building.h}%`,
            }}
            className={cn(
              "absolute flex flex-col items-center justify-center gap-1 rounded-xl border p-1 text-center transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-lift ring-4 ring-primary/20"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {active ? (
              <MapPin className="h-4 w-4 animate-pin-pop" aria-hidden="true" />
            ) : (
              <Icon className="h-4 w-4 opacity-70" aria-hidden="true" />
            )}
            <span className="px-1 text-[11px] font-semibold leading-tight sm:text-xs">
              {building.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
