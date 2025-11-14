import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, trend, trendValue, icon }: MetricCardProps) {
  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-chart-3" />,
    down: <TrendingDown className="h-4 w-4 text-destructive" />,
    neutral: <Minus className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <Card data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`metric-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && trendValue && (
              <div className="flex items-center gap-1">
                {trendIcons[trend]}
                <span className={`text-xs font-medium ${
                  trend === "up" ? "text-chart-3" : 
                  trend === "down" ? "text-destructive" : 
                  "text-muted-foreground"
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
