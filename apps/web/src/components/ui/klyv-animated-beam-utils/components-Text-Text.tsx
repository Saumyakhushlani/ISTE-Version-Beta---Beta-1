import React from "react";
import { cn } from "@/lib/utils";

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "micro" | "sm" | "base" | "lg";
  tone?: "faint" | "muted" | "default" | "accent";
  children?: React.ReactNode;
}

export function Text({ size = "base", tone = "default", className, children, ...props }: TextProps) {
  const sizeClasses = {
    micro: "text-[11px] font-medium tracking-tight whitespace-nowrap",
    sm: "text-xs font-medium",
    base: "text-sm",
    lg: "text-base font-semibold",
  };

  const toneClasses = {
    faint: "text-muted-foreground/80 dark:text-muted-foreground/70",
    muted: "text-muted-foreground",
    default: "text-foreground",
    accent: "text-emerald-600 dark:text-emerald-400 font-semibold",
  };

  return (
    <span className={cn(sizeClasses[size], toneClasses[tone], className)} {...props}>
      {children}
    </span>
  );
}

export default Text;
