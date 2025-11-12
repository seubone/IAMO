import { Skeleton } from "@/components/ui/skeleton";

export function ChatListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-3 flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 6 }).map((_, i) => {
        const isFromMe = i % 3 === 0;
        return (
          <div
            key={i}
            className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex gap-2 max-w-[70%] ${isFromMe ? "flex-row-reverse" : "flex-row"}`}>
              {!isFromMe && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
              <div className="space-y-2">
                <Skeleton className={`h-16 ${i % 2 === 0 ? "w-48" : "w-64"} rounded-lg`} />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
