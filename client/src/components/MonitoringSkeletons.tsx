import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function TicketListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-9" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function IADetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="flex-1 p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
