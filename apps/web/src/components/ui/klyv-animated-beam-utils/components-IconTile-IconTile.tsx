import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IconTileProps {
  icon: LucideIcon;
  tone?: "muted" | "accent" | "faint" | "default";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IconTile({ icon: Icon, tone = "default", size = "sm", className }: IconTileProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const toneClasses = {
    muted: "text-muted-foreground group-hover:text-foreground",
    accent: "text-emerald-500 dark:text-emerald-400",
    faint: "text-muted-foreground/70",
    default: "text-foreground",
  };

  return (
    <div className={cn("flex items-center justify-center transition-colors", className)}>
      <Icon className={cn(sizeClasses[size], toneClasses[tone])} />
    </div>
  );
}

export default IconTile;
