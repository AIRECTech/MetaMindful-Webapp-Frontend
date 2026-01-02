import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "../../lib/utils";

type CardProps = PropsWithChildren<{
  title?: ReactNode;
  className?: string;
  action?: ReactNode;
}>;

export function Card({ title, action, children, className }: CardProps) {
  const showHeader = Boolean(title || action);

  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-sm overflow-hidden", className)}>
      {showHeader && (
        <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {action}
        </div>
      )}
      <div className={cn("bg-background p-6", !showHeader && "rounded-2xl")}>{children}</div>
    </div>
  );
}
