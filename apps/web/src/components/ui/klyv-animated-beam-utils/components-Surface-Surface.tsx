import React from "react";
import { cn } from "@/lib/utils";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "floating" | "flat" | "card";
  children?: React.ReactNode;
}

export function Surface({ variant = "card", className, children, ...props }: SurfaceProps) {
  const variantClasses = {
    floating: "bg-card/95 border border-border shadow-sm backdrop-blur-md group-hover:border-emerald-500/50 group-hover:shadow-emerald-500/10 transition-all",
    flat: "bg-muted/40 border border-border",
    card: "bg-card border border-border shadow-sm",
  };

  return (
    <div className={cn("flex transition-all", variantClasses[variant], className)} {...props}>
      {children}
    </div>
  );
}

export default Surface;
