import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="text-muted-foreground mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
