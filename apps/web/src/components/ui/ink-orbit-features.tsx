"use client"

// The features section from ink-orbit-saas-template, tailored for Financial Decision Lab (FDL):
// A hatched slate/dark page and an interactive bento of three live diagrams:
// 1. Transaction streams flowing through the FDL Math Hub into a continuously generated Reasoning Ledger stack
// 2. Bank ingestion hub connecting local statements (HDFC, SBI, ICICI, Axis) with balance reconciliation math
// 3. Monte Carlo headroom forecast chart with interactive pointer scrubbing (P10/P50/P90).

import React from "react"
import { useTheme as useAppTheme } from "@/components/theme-context"

export type InkFeatureCopy = { title: string; description: string }
export type InkFeatures = {
  tag: string
  /** `*word*` sets a word in the muted tone; `\n` breaks the line. */
  title: string
  collaboration: InkFeatureCopy
  reports: InkFeatureCopy
  integrations: InkFeatureCopy & { tools: string[] }
  insights: InkFeatureCopy & { values: number[]; forecastFrom: number }
}

export type InkOrbitFeaturesProps = {
  /** `auto` follows app/prefers-color-scheme. */
  theme?: "light" | "dark" | "auto"
  /** Shown on the hub chip in the flow diagram (first word, uppercased). */
  brand?: string
  tag?: string
  title?: string
  collaboration?: { [K in keyof InkFeatureCopy]?: InkFeatureCopy[K] }
  reports?: { [K in keyof InkFeatureCopy]?: InkFeatureCopy[K] }
  integrations?: { [K in keyof InkFeatures["integrations"]]?: InkFeatures["integrations"][K] }
  insights?: { [K in keyof InkFeatures["insights"]]?: InkFeatures["insights"][K] }
  className?: string
  style?: React.CSSProperties
}

/* ------------------------------------------------------------------ logic */

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

// Smooth line + closed area through values, inside a w×h box.
function chartPaths(values: number[], w: number, h: number, pad: number) {
  const n = values.length
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map((v, i) => [
    pad + (n < 2 ? 0 : (i / (n - 1)) * (w - pad * 2)),
    h - pad - ((v - lo) / span) * (h - pad * 2),
  ] as [number, number])
  let line = ""
  pts.forEach(([x, y], i) => {
    if (i === 0) {
      line = "M" + x.toFixed(1) + "," + y.toFixed(1)
      return
    }
    const [px, py] = pts[i - 1]
    const cx = (px + x) / 2
    line += " C" + cx.toFixed(1) + "," + py.toFixed(1) + " " + cx.toFixed(1) + "," + y.toFixed(1) + " " + x.toFixed(1) + "," + y.toFixed(1)
  })
  const area = n ? line + " L" + pts[n - 1][0].toFixed(1) + "," + (h - pad) + " L" + pts[0][0].toFixed(1) + "," + (h - pad) + " Z" : ""
  return { line, area, points: pts }
}

function nearestIndex(xs: number[], x: number): number {
  let best = 0
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i
  return best
}

// "Deterministic *Math*\nUnshakeable Verdicts" → lines of { text, muted } runs.
function parseTitle(s: string): { text: string; muted: boolean }[][] {
  return s.split(/\n|\\n/).map((line) => {
    const out: { text: string; muted: boolean }[] = []
    line.split("*").forEach((text, i) => {
      if (text) out.push({ text, muted: i % 2 === 1 })
    })
    return out
  })
}

/* --------------------------------------------------------------- defaults */

const D_FEATURES: InkFeatures = {
  tag: "Deterministic Verification Flow",
  title: "Deterministic *Math*.\nUnshakeable Verdicts.",
  collaboration: {
    title: "Continuous Statement Streaming",
    description: "Categorized credits and recurring debits stream into the deterministic calculation pipeline in integer paise — zero float drift.",
  },
  reports: {
    title: "8-Step Reasoning Ledger",
    description: "Every verdict is proven through an immutable mathematical audit trail linking balance, obligations, buffer, and final headroom.",
  },
  integrations: {
    title: "Local-First Ingestion & Reconciliation",
    description: "Auto-detects HDFC, SBI, ICICI & Axis statements. Strictly verifies Opening + ΣTx = Closing. Zero cloud data egress.",
    tools: ["HDFC", "SBI", "ICICI", "Axis"],
  },
  insights: {
    title: "Monte Carlo Headroom Forecast",
    description: "5,000 simulations evaluate daily cash flow volatility to establish exact P10 conservative and P50 median safety margins.",
    values: [42, 45, 41, 52, 48, 58, 54, 65, 62, 74, 82, 89],
    forecastFrom: 7,
  },
}

/* -------------------------------------------------------------- component */

export default function InkOrbitFeatures({
  theme = "auto",
  brand = "FDL Core",
  tag = D_FEATURES.tag,
  title = D_FEATURES.title,
  collaboration,
  reports,
  integrations,
  insights,
  className = "",
  style,
}: InkOrbitFeaturesProps) {
  const uid = "fdl" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const F: InkFeatures = {
    tag,
    title,
    collaboration: { ...D_FEATURES.collaboration, ...collaboration },
    reports: { ...D_FEATURES.reports, ...reports },
    integrations: { ...D_FEATURES.integrations, ...integrations },
    insights: { ...D_FEATURES.insights, ...insights },
  }

  // Hook into app theme context if available
  let appThemeIsDark: boolean | null = null
  try {
    const appTheme = useAppTheme()
    appThemeIsDark = appTheme?.isDark ?? null
  } catch {
    appThemeIsDark = null
  }

  const [dark, setDark] = React.useState(theme === "dark" || (theme === "auto" && appThemeIsDark === true))
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    if (theme === "dark") {
      setDark(true)
      return
    }
    if (theme === "light") {
      setDark(false)
      return
    }
    if (appThemeIsDark !== null) {
      setDark(appThemeIsDark)
      return
    }
    if (typeof window === "undefined" || !window.matchMedia) return
    const scheme = window.matchMedia("(prefers-color-scheme: dark)")
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => {
      const isDocDark = document.documentElement.classList.contains("dark")
      setDark(isDocDark || scheme.matches)
      setReduced(motion.matches)
    }
    sync()
    scheme.addEventListener?.("change", sync)
    motion.addEventListener?.("change", sync)
    return () => {
      scheme.removeEventListener?.("change", sync)
      motion.removeEventListener?.("change", sync)
    }
  }, [theme, appThemeIsDark])

  const [featRef, featIn] = useInView(0.12)

  return (
    <div className={"ib-root " + className} data-theme={dark ? "dark" : "light"} style={style}>
      <div className="ib-shell">
        <section className="ib-sec" aria-labelledby={uid + "feat"}>
          <div className="ib-reveal" ref={featRef as never} data-in={featIn}>
            <div className="ib-head" id={uid + "feat"}>
              {F.tag && (
                <div className="ib-tag-wrapper">
                  <span className="ib-tag-dot" />
                  <span className="ib-tag">{F.tag}</span>
                </div>
              )}
              <Title text={F.title} />
            </div>
            <div className="ib-bento">
              <FlowCard brand={brand} features={F} uid={uid} reduced={reduced} inView={featIn} />
              <IntegrationsCard copy={F.integrations} reduced={reduced} />
              <InsightsCard copy={F.insights} uid={uid} reduced={reduced} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- pieces */

function useInView(threshold = 0.2) {
  const ref = React.useRef(null as HTMLElement | null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (typeof IntersectionObserver !== "function") {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, threshold])
  return [ref, inView] as const
}

function Brackets() {
  return null
}

function Title({ text, className = "ib-h2", as = "h2" }: { text: string; className?: string; as?: "h2" | "h3" }) {
  const Tag = as
  return (
    <Tag className={className}>
      {parseTitle(text).map((line, i) => (
        <span key={i}>
          {line.map((run, j) => (
            <React.Fragment key={j}>
              {run.muted ? <span className="ib-muted" style={{ display: "inline" }}>{run.text}</span> : run.text}
            </React.Fragment>
          ))}
        </span>
      ))}
    </Tag>
  )
}

function FDLMark({ size = 18 }: { size?: number }) {
  // FDL 3-bar histogram emblem (matches platform identity)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="10" width="4" height="11" rx="1.5" fill="currentColor" opacity="0.8" />
      <rect x="10" y="4" width="4" height="17" rx="1.5" fill="currentColor" />
      <rect x="17" y="7" width="4" height="14" rx="1.5" fill="currentColor" opacity="0.9" />
    </svg>
  )
}

/* Financial account glyphs */
function FinancialToolGlyph({ index }: { index: number }) {
  const k = index % 4
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {k === 0 && (
        // Bank Building (HDFC)
        <>
          <path d="M-6 -1 L0 -6 L6 -1 Z" />
          <line x1="-5" y1="0" x2="5" y2="0" />
          <line x1="-4" y1="0" x2="-4" y2="6" />
          <line x1="0" y1="0" x2="0" y2="6" />
          <line x1="4" y1="0" x2="4" y2="6" />
          <line x1="-6" y1="6" x2="6" y2="6" />
        </>
      )}
      {k === 1 && (
        // Passbook / Ledger (SBI)
        <>
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <line x1="-3" y1="-2" x2="3" y2="-2" />
          <line x1="-3" y1="1" x2="3" y2="1" />
          <line x1="-3" y1="4" x2="1" y2="4" />
        </>
      )}
      {k === 2 && (
        // Credit Card / NetBanking (ICICI)
        <>
          <rect x="-7" y="-5" width="14" height="10" rx="1.5" />
          <line x1="-7" y1="-1" x2="7" y2="-1" />
          <line x1="-4" y1="2" x2="-1" y2="2" />
        </>
      )}
      {k === 3 && (
        // UPI / QR Exchange (Axis)
        <>
          <path d="M-4 -4 L0 -6 L4 -4" />
          <path d="M4 4 L0 6 L-4 4" />
          <circle cx="0" cy="0" r="2.5" />
        </>
      )}
    </g>
  )
}

/* Financial Source Badges for the Flow Card */
const FLOW_SOURCES = [
  { name: "Salary · HDFC (+₹85,000)", code: "HDFC", color: "#10b981", type: "credit" },
  { name: "Rent · SBI (-₹24,000)", code: "SBI", color: "#f59e0b", type: "debit" },
  { name: "Utilities · ICICI (-₹3,400)", code: "ICICI", color: "#3b82f6", type: "debit" },
  { name: "Groceries · UPI (-₹12,450)", code: "UPI", color: "#8b5cf6", type: "debit" },
  { name: "SIP · Mutual Fund (-₹10,000)", code: "SIP", color: "#06b6d4", type: "debit" },
]

function SourceBadge({ index, uid }: { index: number; uid: string }) {
  const item = FLOW_SOURCES[index % FLOW_SOURCES.length]
  const isCredit = item.type === "credit"
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" overflow="visible">
      <circle cx="12" cy="12" r="11" fill="var(--ib-raise)" stroke="var(--ib-line-strong)" strokeWidth="1.2" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill={isCredit ? "var(--ib-accent)" : "var(--ib-soft)"}
        fontFamily="var(--ib-mono)"
      >
        {item.code.slice(0, 3)}
      </text>
    </svg>
  )
}

function FlowCard({ brand, features, uid, reduced, inView }: { brand: string; features: InkFeatures; uid: string; reduced: boolean; inView: boolean }) {
  const [reports, setReports] = React.useState(184)
  const [side, setSide] = React.useState("" as "" | "left" | "right")

  React.useEffect(() => {
    if (reduced || !inView) return
    const t = setInterval(() => setReports((n) => n + 1), 2800)
    return () => clearInterval(t)
  }, [reduced, inView])

  const streams = [
    { x: 58, y: 38, name: FLOW_SOURCES[0].name, isCredit: true },
    { x: 104, y: 22, name: FLOW_SOURCES[1].name, isCredit: false },
    { x: 150, y: 40, name: FLOW_SOURCES[2].name, isCredit: false },
    { x: 46, y: 92, name: FLOW_SOURCES[3].name, isCredit: false },
    { x: 146, y: 114, name: FLOW_SOURCES[4].name, isCredit: false },
  ]

  const L1 = "M117,67 C196,67 210,100 262,100" // stream nodes into hub
  const L2 = "M117,73 C186,73 206,120 262,120"
  const R1 = "M378,100 C412,100 418,86 450,86" // hub into reasoning ledger
  const R2 = "M378,120 C412,120 418,134 450,134"

  const chip = brand.split(" ")[0].toUpperCase() + (brand.split(" ")[1] ? " " + brand.split(" ")[1].toUpperCase() : "")
  const rays = uid + "rays"
  const glow = uid + "glow"

  return (
    <div className="ib-frame ib-frame-hover ib-wide">
      <Brackets />
      <div className="ib-card" style={{ padding: 0, overflow: "hidden" }}>
        <svg className="ib-diagram" viewBox="0 0 640 185" role="img" aria-label={"Transaction streams calculate through " + brand + " into proven Reasoning Ledgers"}>
          <defs>
            <radialGradient id={glow} cx="320" cy="110" r="190" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--ib-raise)" stopOpacity="1" />
              <stop offset="1" stopColor="var(--ib-raise)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={rays} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ib-accent)" stopOpacity=".22" />
              <stop offset="1" stopColor="var(--ib-line-strong)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="640" height="185" fill={"url(#" + glow + ")"} />
          {[-62, -38, -14, 14, 38, 62].map((a, i) => (
            <path
              key={i}
              d={"M320,110 L" + (320 + Math.sin((a * Math.PI) / 180) * 260) + "," + (110 - Math.cos((a * Math.PI) / 180) * 260) + " L" + (320 + Math.sin(((a + 7) * Math.PI) / 180) * 260) + "," + (110 - Math.cos(((a + 7) * Math.PI) / 180) * 260) + "Z"}
              fill={"url(#" + rays + ")"}
              opacity=".45"
            />
          ))}

          {/* Transaction feeds cluster */}
          <g onMouseEnter={() => setSide("left")} onMouseLeave={() => setSide("")}>
            <rect x="20" y="8" width="170" height="135" fill="transparent" />
            {streams.map((m, i) => (
              <line key={"l" + i} x1={m.x} y1={m.y} x2="104" y2="70" stroke="var(--ib-line-strong)" strokeDasharray="2 3" />
            ))}
            <g transform="translate(90,56)">
              <rect width="28" height="28" rx="6" className="ib-node" />
              <g transform="translate(5,5)" style={{ color: "var(--ib-accent)" }}>
                <FDLMark size={18} />
              </g>
            </g>
            {streams.map((m, i) => (
              <g key={i} className="ib-av" tabIndex={0} role="img" aria-label={m.name}>
                <g transform={"translate(" + (m.x - 12) + "," + (m.y - 12) + ")"}>
                  <SourceBadge index={i} uid={uid} />
                </g>
                <circle
                  cx={m.x + 8}
                  cy={m.y + 8}
                  r="2.6"
                  fill={m.isCredit ? "var(--ib-accent)" : "#f59e0b"}
                  stroke="var(--ib-paper)"
                  className="ib-presence"
                />
                <g className="ib-av-tip" transform={"translate(" + m.x + "," + (m.y - 18) + ")"}>
                  <rect x={-m.name.length * 2.5 - 6} y="-9" width={m.name.length * 5 + 12} height="14" rx="3" fill="var(--ib-inv)" />
                  <text x="0" y="1" textAnchor="middle" fontSize="7.5" fill="var(--ib-inv-ink)" fontFamily="var(--ib-sans)">
                    {m.name}
                  </text>
                </g>
              </g>
            ))}
          </g>

          {/* Connectors */}
          {[L1, L2].map((d, i) => (
            <path key={d} d={d} className={"ib-flow" + (side === "left" ? " ib-flow-on" : "") + (i ? " ib-dash" : "")} />
          ))}
          {[R1, R2].map((d, i) => (
            <path key={d} d={d} className={"ib-flow" + (side === "right" ? " ib-flow-on" : "") + (i ? " ib-dash" : "")} />
          ))}
          {!reduced &&
            [L1, L2, R1, R2].map((d, i) => (
              <circle key={"p" + i} r="2.2" className="ib-pkt">
                <animateMotion dur={2.2 + (i % 2) * 0.6 + "s"} begin={i * 0.35 + "s"} repeatCount="indefinite" path={d} />
              </circle>
            ))}

          {/* The Hub Chip (Deterministic Calculation Engine) */}
          <g transform="translate(260,88)">
            <rect x="-4" y="-4" width="124" height="52" rx="8" fill="none" stroke="var(--ib-accent)" strokeOpacity="0.4" className={reduced ? undefined : "ib-glow"} />
            <rect width="116" height="44" rx="6" className="ib-node" style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,.15))" }} />
            <g transform="translate(12,13)" style={{ color: "var(--ib-accent)" }}>
              <FDLMark size={18} />
            </g>
            <text x="36" y="24" fontSize="8.5" letterSpacing="1.2" fontWeight="700" fill="var(--ib-ink)" fontFamily="var(--ib-sans)">
              {chip}
            </text>
            <text x="36" y="34" fontSize="6.5" letterSpacing="0.8" fill="var(--ib-accent)" fontFamily="var(--ib-mono)">
              INTEGER PAISE · 0 FLOAT
            </text>
            <path d="M100 18l4 4-4 4" fill="none" stroke="var(--ib-muted)" strokeWidth="1.3" />
          </g>

          {/* The Reasoning Ledger Stack */}
          <g onMouseEnter={() => setSide("right")} onMouseLeave={() => setSide("")}>
            {[2, 1, 0].map((k) => (
              <g key={reports - k} transform={"translate(" + (450 + k * 12) + "," + (40 - k * 10) + ")"} opacity={1 - k * 0.25}>
                <g className={"ib-sheet" + (k === 0 ? " ib-sheet-new" : "")}>
                  <rect width="144" height="106" rx="4" fill="var(--ib-raise)" stroke="var(--ib-line-strong)" />
                  {k === 0 && (
                    <>
                      <text x="10" y="16" fontSize="7" fontWeight="600" fill="var(--ib-muted)" fontFamily="var(--ib-mono)">
                        {"LEDGER #" + reports}
                      </text>
                      {/* Verdict Pill */}
                      <rect x="74" y="8" width="60" height="12" rx="3" fill="var(--ib-accent)" fillOpacity="0.15" stroke="var(--ib-accent)" strokeWidth="0.8" />
                      <text x="104" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="var(--ib-accent)" fontFamily="var(--ib-mono)">
                        CAN AFFORD ✓
                      </text>
                      {/* Metric lines */}
                      <text x="10" y="32" fontSize="6.5" fill="var(--ib-soft)" fontFamily="var(--ib-mono)">
                        Opening: ₹1,42,800.00
                      </text>
                      <text x="10" y="42" fontSize="6.5" fill="var(--ib-soft)" fontFamily="var(--ib-mono)">
                        Buffer: ₹35,000 (1.5x)
                      </text>
                      <text x="10" y="52" fontSize="7" fontWeight="700" fill="var(--ib-accent)" fontFamily="var(--ib-mono)">
                        Headroom: +₹48,500.00
                      </text>
                      <line x1="10" y1="58" x2="134" y2="58" stroke="var(--ib-line)" strokeWidth="1" />
                      {/* Percentile distribution bars (Monte Carlo P10-P90) */}
                      {[16, 24, 20, 32, 28, 38, 44].map((h, j) => (
                        <rect
                          key={j}
                          x={12 + j * 16}
                          y={98 - h}
                          width="9"
                          height={h}
                          rx="1.5"
                          fill="var(--ib-accent)"
                          opacity={0.3 + j * 0.1}
                        />
                      ))}
                      <text x="10" y="102" fontSize="5.5" fill="var(--ib-faint)" fontFamily="var(--ib-mono)">
                        P10 · P50 · P90
                      </text>
                    </>
                  )}
                </g>
              </g>
            ))}
          </g>
        </svg>

        <div className="ib-wide-copy" style={{ padding: "0 22px 20px" }}>
          <div>
            <h3>{features.collaboration.title}</h3>
            <p>{features.collaboration.description}</p>
          </div>
          <div>
            <h3>{features.reports.title}</h3>
            <p>{features.reports.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function IntegrationsCard({ copy, reduced }: { copy: InkFeatures["integrations"]; reduced: boolean }) {
  const [hover, setHover] = React.useState(-1)
  const [auto, setAuto] = React.useState(0)

  React.useEffect(() => {
    if (reduced || hover >= 0) return
    const t = setInterval(() => setAuto((a) => (a + 1) % 4), 1700)
    return () => clearInterval(t)
  }, [reduced, hover])

  const on = hover >= 0 ? hover : reduced ? -1 : auto
  const tiles = [
    { x: 66, y: 34 },
    { x: 66, y: 116 },
    { x: 234, y: 34 },
    { x: 234, y: 116 },
  ]
  const path = (i: number) => {
    const t = tiles[i]
    if (t.x < 150) {
      const x1 = t.x + 16
      const x2 = 133
      const midX = (x1 + x2) / 2
      return "M " + x1 + "," + t.y + " C " + midX + "," + t.y + " " + midX + ",75 " + x2 + ",75"
    } else {
      const x1 = t.x - 16
      const x2 = 167
      const midX = (x1 + x2) / 2
      return "M " + x1 + "," + t.y + " C " + midX + "," + t.y + " " + midX + ",75 " + x2 + ",75"
    }
  }

  const toolLabels = ["HDFC Bank", "SBI Ledger", "ICICI Net", "Axis UPI"]

  return (
    <div className="ib-frame ib-frame-hover">
      <Brackets />
      <div className="ib-card">
        <svg className="ib-diagram" viewBox="0 0 300 150" role="group" aria-label="Statement Ingestion & Reconciliation">
          {tiles.map((_, i) => (
            <path key={i} d={path(i)} className={"ib-flow" + (on === i ? " ib-flow-on" : "")} />
          ))}
          {!reduced && on >= 0 && (
            <circle key={on} r="2.2" className="ib-pkt">
              <animateMotion dur="1.1s" repeatCount="indefinite" path={path(on)} />
            </circle>
          )}
          <g transform="translate(133,58)">
            <rect width="34" height="34" rx="8" className="ib-node" style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.12))" }} />
            <g transform="translate(8,8)" style={{ color: "var(--ib-accent)" }}>
              <FDLMark size={18} />
            </g>
          </g>
          {tiles.map((t, i) => (
            <g
              key={i}
              className={"ib-tool" + (on === i ? " ib-tool-on" : "")}
              tabIndex={0}
              role="img"
              aria-label={toolLabels[i] ?? "Bank Source"}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(-1)}
            >
              <rect x={t.x - 16} y={t.y - 16} width="32" height="32" rx="7" className="ib-node" />
              <g transform={"translate(" + t.x + "," + t.y + ")"} style={{ color: on === i ? "var(--ib-accent)" : "var(--ib-ink)" }}>
                <FinancialToolGlyph index={i} />
              </g>
              <text
                x={t.x}
                y={t.y + (t.y < 75 ? -21 : 28)}
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                fill="var(--ib-accent)"
                fontFamily="var(--ib-mono)"
                opacity={on === i ? 1 : 0}
                style={{ transition: "opacity .25s" }}
              >
                {toolLabels[i] ?? ""}
              </text>
            </g>
          ))}
          <text x="150" y="112" textAnchor="middle" fontSize="7.5" fill="var(--ib-soft)" fontFamily="var(--ib-mono)">
            {on >= 0 ? "reconciling · " + (copy.tools[on] ?? "").toLowerCase() : "Opening + ΣTx = Closing"}
          </text>
        </svg>
        <div style={{ marginTop: "auto" }}>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
      </div>
    </div>
  )
}

function InsightsCard({ copy, uid, reduced }: { copy: InkFeatures["insights"]; uid: string; reduced: boolean }) {
  const [ref, inView] = useInView(0.3)
  const [hover, setHover] = React.useState(-1)
  const W = 300
  const H = 130
  const vals = copy.values.length > 1 ? copy.values : [1, 2]
  const { line, area, points } = chartPaths(vals, W, H, 14)
  const split = clamp(copy.forecastFrom, 1, vals.length - 1)
  const fill = uid + "area"
  const last = points[points.length - 1]
  const i = hover >= 0 ? hover : points.length - 1
  const p = points[i]
  const pct = Math.round(((vals[i] - vals[0]) / (vals[0] || 1)) * 100)
  const currentValRupees = "₹" + vals[i] + "k"

  const onMove = (e: PointerSvgEv) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(nearestIndex(points.map((q) => q[0]), ((e.clientX - r.left) / r.width) * W))
  }

  return (
    <div className="ib-frame ib-frame-hover" ref={ref as never} data-in={inView}>
      <Brackets />
      <div className="ib-card">
        <svg
          className="ib-diagram ib-chart"
          viewBox={"0 0 " + W + " " + (H + 6)}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(-1)}
          role="img"
          aria-label={copy.title + " chart"}
        >
          <defs>
            <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ib-accent)" stopOpacity=".22" />
              <stop offset="1" stopColor="var(--ib-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="14" x2={W - 14} y1={H * g} y2={H * g} stroke="var(--ib-line)" />
          ))}
          <path d={area} fill={"url(#" + fill + ")"} />
          <path d={line} fill="none" stroke="var(--ib-accent)" strokeWidth="1.6" pathLength={1} className="ib-line-draw" opacity=".95" />
          <line x1={points[split][0]} x2={points[split][0]} y1="10" y2={H - 14} stroke="var(--ib-line-strong)" strokeDasharray="2 3" />
          <text x={points[split][0] - 4} y={H - 18} textAnchor="end" fontSize="7" fontWeight="600" fill="var(--ib-faint)" fontFamily="var(--ib-mono)">
            FORECAST (P50)
          </text>
          {hover >= 0 && <line x1={p[0]} x2={p[0]} y1="8" y2={H - 14} stroke="var(--ib-ink)" strokeOpacity=".4" />}
          {!reduced && hover < 0 && <circle cx={last[0]} cy={last[1]} r="7" fill="var(--ib-accent)" opacity=".2" className="ib-glow" />}
          <circle cx={p[0]} cy={p[1]} r="3.4" fill="var(--ib-raise)" stroke="var(--ib-accent)" strokeWidth="1.8" />
          <g transform={"translate(" + clamp(p[0], 70, W - 70) + "," + (p[1] < 34 ? p[1] + 24 : p[1] - 14) + ")"}>
            <rect x="-65" y="-12.5" width="130" height="18" rx="4" fill="var(--ib-inv)" />
            <text x="0" y="-3.5" dominantBaseline="middle" textAnchor="middle" fontSize="7" fill="var(--ib-inv-ink)" fontFamily="var(--ib-mono)">
              {(i >= split ? "pred " : "day " + (i + 1) * 3 + " ") + currentValRupees + " (" + (pct >= 0 ? "+" : "") + pct + "%)"}
            </text>
          </g>
        </svg>
        <div style={{ marginTop: "auto" }}>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
      </div>
    </div>
  )
}


type PointerSvgEv = React.PointerEvent<SVGSVGElement>
