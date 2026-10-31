"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Github, 
  Linkedin, 
  Moon, 
  Send, 
  Sun, 
  Twitter, 
  ShieldCheck, 
  Cpu, 
  Lock,
  CheckCircle2,
  Layers,
  ArrowRight
} from "lucide-react"
import { useTheme } from "@/components/theme-context"

interface FooterSectionProps {
  currentPath?: "home" | "how-it-works"
}

export function FooterSection({ currentPath = "home" }: FooterSectionProps) {
  const { isDark, toggleTheme } = useTheme()
  const [subscribed, setSubscribed] = React.useState(false)
  const [email, setEmail] = React.useState("")

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setTimeout(() => setSubscribed(false), 4000)
      setEmail("")
    }
  }

  return (
    <footer className="relative border-t border-border bg-card/60 backdrop-blur-sm text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-16 md:px-6 lg:px-8 max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Mission & Newsletter */}
          <div className="relative space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Financial Decision Lab
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              The personal finance intelligence engine that proves every calculation. 100% local-first, zero hallucinations, and deterministic integer paise math.
            </p>

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-foreground mb-2">Engine Updates</h4>
              {subscribed ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Subscribed to local engine release notes!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="relative flex items-center">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pr-12 text-xs h-9 bg-background/80 border-border focus-visible:ring-primary"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="sr-only">Subscribe</span>
                  </Button>
                </form>
              )}
            </div>
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          </div>

          {/* Column 2: Navigation & Product */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Product &amp; Lab
            </h3>
            <nav className="space-y-2.5 text-xs">
              <Link 
                href="/" 
                className={`block transition-colors hover:text-primary ${currentPath === "home" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                Home Overview
              </Link>
              <Link 
                href="/how-it-works" 
                className={`block transition-colors hover:text-primary ${currentPath === "how-it-works" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                How It Works &amp; Architecture
              </Link>
              <Link href="/dashboard" className="block text-muted-foreground transition-colors hover:text-primary">
                Executive Dashboard
              </Link>
              <Link href="/lab" className="block text-muted-foreground transition-colors hover:text-primary">
                Affordability &amp; What-If Lab
              </Link>
              <Link href="/upload" className="block text-muted-foreground transition-colors hover:text-primary">
                Bank Statement Ingestion
              </Link>
              <Link href="/transactions" className="block text-muted-foreground transition-colors hover:text-primary">
                Categorized Transactions
              </Link>
              <Link href="/recurring" className="block text-muted-foreground transition-colors hover:text-primary">
                Subscriptions &amp; Bills
              </Link>
            </nav>
          </div>

          {/* Column 3: Mathematical Pillars & Invariants */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Engine Invariants
            </h3>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Deterministic Integer Paise</span>
              </li>
              <li className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>8-Step Reasoning Ledger</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>5,000 Monte Carlo Paths</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-chart-4 shrink-0" />
                <span>Data Sufficiency Gate</span>
              </li>
              <li className="pt-2">
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  View full technical specs
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Local Air-Gap, Community & Theme */}
          <div className="relative space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Privacy &amp; Community
            </h3>
            
            <p className="text-xs text-muted-foreground">
              Statements, transactions, and balances remain strictly on your device in SQLite (<code className="font-mono text-foreground">fdl.db</code>).
            </p>

            {/* Social Icons */}
            <div className="flex space-x-2 pt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Github className="h-4 w-4" />
                      <span className="sr-only">GitHub</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open Source Repository</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://twitter.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      <span className="sr-only">Twitter</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow on X / Twitter</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://linkedin.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span className="sr-only">LinkedIn</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Connect on LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/privacy"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span className="sr-only">Privacy Audit</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Inspect Egress Log</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Dark Mode Switcher */}
            <div className="pt-2">
              <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border border-border bg-background/60">
                <Sun className={`h-3.5 w-3.5 transition-colors ${!isDark ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <Switch
                  id="footer-dark-mode"
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                />
                <Moon className={`h-3.5 w-3.5 transition-colors ${isDark ? 'text-primary' : 'text-muted-foreground'}`} />
                <Label htmlFor="footer-dark-mode" className="text-xs text-muted-foreground cursor-pointer select-none">
                  {isDark ? "Dark theme" : "Light theme"}
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center sm:flex-row text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Financial Decision Lab. 100% Local-First &amp; Deterministic.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy &amp; Air-Gap Audit
            </Link>
            <Link href="/how-it-works" className="transition-colors hover:text-foreground">
              Architecture &amp; Formulas
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Live Demo
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign In
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default FooterSection
