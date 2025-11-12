import { Badge } from "@/components/ui/badge";
import { getIAStatusConfig } from "@/lib/configs";

export type IAStatus = "active" | "paused" | "inactive";

export interface IATickerItem {
  id: string;
  name: string;
  status: IAStatus;
}

interface IAStatusTickerProps {
  items: IATickerItem[];
}

export function IAStatusTicker({ items }: IAStatusTickerProps) {
  return (
    <div className="h-12 border-b bg-card/50 overflow-hidden">
      <div className="flex items-center h-full px-4 gap-3 animate-scroll">
        {items.map((item) => {
          const config = getIAStatusConfig(item.status);
          const StatusIcon = config.icon;
          
          return (
            <Badge
              key={item.id}
              variant="outline"
              className="flex items-center gap-2 px-3 shrink-0"
              data-testid={`ticker-ia-${item.id}`}
            >
              <StatusIcon className={`h-3 w-3 ${config.color}`} />
              <span className="text-xs font-medium">{item.name}</span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
