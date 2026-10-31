"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  CheckCircle2, 
  Wallet, 
  ShieldCheck, 
  FileSpreadsheet, 
  Sparkles,
  Lock,
  CalendarCheck
} from "lucide-react"

interface BentoCardItem {
  title: string
  description: string
  badge?: string
  icon?: React.ElementType
  highlight?: string
}

const customerBentoCards: BentoCardItem[] = [
  {
    title: "Know If You Can Afford It Before You Spend",
    badge: "CONFIDENT DECISIONS",
    icon: Wallet,
    highlight: "Safe-to-Spend Limit",
    description:
      "Planning to buy a gadget, book a holiday, or sign up for a course? Instead of guessing or anxiously checking bank apps, get a straightforward answer before you spend your hard-earned money.",
  },
  {
    title: "Drop In Any Bank or UPI Statement",
    badge: "ZERO MANUAL DATA ENTRY",
    icon: FileSpreadsheet,
    highlight: "Works with All Major Indian Banks",
    description:
      "Upload your PDF or CSV statements from HDFC, SBI, ICICI, PhonePe, or Google Pay. We automatically clean messy merchant transaction codes and organize everything in seconds.",
  },
  {
    title: "Never Get Caught Off Guard by Upcoming Bills",
    badge: "AUTOMATIC RADAR",
    icon: CalendarCheck,
    highlight: "Rent, EMIs, SIPs & Subscriptions",
    description:
      "The app automatically detects your upcoming rent, insurance premiums, EMIs, and monthly subscriptions. It sets aside money for them in advance, so you never accidentally spend what is already spoken for.",
  },
  {
    title: "100% Private on Your Device",
    badge: "AIR-GAPPED PRIVACY",
    icon: Lock,
    highlight: "Zero Cloud Telemetry",
    description:
      "Your personal finances are your business. Your bank statements and transaction history are stored securely on your local device—never sent to cloud servers or sold to advertisers.",
  },
  {
    title: "Clear Step-by-Step Proof, Never Hallucinated Advice",
    badge: "NO GUESSWORK",
    icon: Sparkles,
    highlight: "Every Rupee Accounted For",
    description:
      "Generic chatbots often make up numbers and give vague advice. Our engine calculates every figure mathematically and shows you the exact simple arithmetic behind your safe budget.",
  },
]

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={20}
    height={20}
    strokeWidth="1.5"
    stroke="currentColor"
    className={cn("text-muted-foreground/40 w-4 h-4 pointer-events-none select-none", className)}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
)

const CornerPlusIcons = () => (
  <>
    <PlusIcon className="absolute -top-2 -left-2" />
    <PlusIcon className="absolute -top-2 -right-2" />
    <PlusIcon className="absolute -bottom-2 -left-2" />
    <PlusIcon className="absolute -bottom-2 -right-2" />
  </>
)

const PlusCard: React.FC<{
  className?: string
  title: string
  description: string
  badge?: string
  icon?: React.ElementType
  highlight?: string
}> = ({
  className = "",
  title,
  description,
  badge,
  icon: Icon,
  highlight,
}) => {
  return (
    <div
      className={cn(
        "relative border border-dashed border-border/80 dark:border-border/60 rounded-2xl p-6 sm:p-7 bg-card/75 dark:bg-card/40 backdrop-blur-xs min-h-[220px]",
        "flex flex-col justify-between transition-all duration-300 hover:border-primary/50 hover:bg-card/90 hover:shadow-sm",
        className
      )}
    >
      <CornerPlusIcons />

      <div className="relative z-10 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          {badge && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase font-mono px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
              {badge}
            </span>
          )}
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0 border border-border/70">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {highlight && (
        <div className="relative z-10 pt-4 mt-2 border-t border-border/50 flex items-center gap-2 text-xs font-semibold text-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{highlight}</span>
        </div>
      )}
    </div>
  )
}

export function RuixenBentoCards() {
  return (
    <section id="how-it-helps" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-xs text-primary font-semibold font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            SIMPLE &amp; STRESS-FREE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Personal Finance That Gives You Peace of Mind
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            No confusing spreadsheets or complex finance jargon. Here is how Financial Decision Lab helps you make confident everyday money decisions.
          </p>
        </div>

        {/* Responsive Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5">
          {/* Card 1: Main hero card */}
          <PlusCard {...customerBentoCards[0]} className="lg:col-span-3 lg:row-span-1" />

          {/* Card 2: Drop statements */}
          <PlusCard {...customerBentoCards[1]} className="lg:col-span-3 lg:row-span-1" />

          {/* Card 3: Upcoming bills radar */}
          <PlusCard {...customerBentoCards[2]} className="lg:col-span-4 lg:row-span-1" />

          {/* Card 4: Local privacy */}
          <PlusCard {...customerBentoCards[3]} className="lg:col-span-2 lg:row-span-1" />

          {/* Card 5: Full width bottom proof card */}
          <PlusCard 
            {...customerBentoCards[4]} 
            className="lg:col-span-6 lg:row-span-1" 
          />
        </div>
      </div>
    </section>
  )
}

export default RuixenBentoCards
