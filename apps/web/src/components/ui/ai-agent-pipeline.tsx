"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const messages = [
  'Query: "Can I afford iPhone 16 (?80,000) on 5th next month?"',
  "Ingesting HDFC & SBI statements ? 842 transactions parsed",
  "Reconciliation Gate: Opening + ?Tx = Closing (? = 0 paise, PASS)",
  "Sufficiency Gate passed: 184 days history (>90d), 0 gaps > 7d",
  "Cadence Detector: Rent ?32,000, Zerodha SIP ?25,000, Utilities ?4,500",
  "Monte Carlo Engine: 5,000 daily spend paths simulated (seed: 42)",
  "Dynamic Safety Buffer: Floor ?40,000 vs Essentials ? 1.2k ? ?58,000",
  "Reasoning Ledger: 8 immutable steps linked in integer paise",
  "Number Guard: 100% regex match between narrative & ledger (0 drift)",
  "Affordability Verdict: AFFORDABLE (P50 Headroom: +?42,000 verified)",
  "Privacy Guard: 0 bytes egressed ? All operations local in fdl.db",
  "Idle. Listening for next financial scenario or statement upload...",
]

function AnimatedDot({
  path,
  duration,
  delay,
  size,
  opacity,
}: {
  path: string
  duration: number
  delay: number
  size: number
  opacity: number
}) {
  return (
    <circle r={size} fill="#10b981" opacity={opacity}>
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={path}
      />
    </circle>
  )
}

function PulsingDot({
  cx,
  cy,
  color,
  duration,
  delay = 0,
}: {
  cx: number
  cy: number
  color: string
  duration: number
  delay?: number
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={2.8}
      fill={color}
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

function StatusIndicator({
  cx,
  cy,
  color,
  pulsing = false,
  duration = 1.9,
  delay = 0,
}: {
  cx: number
  cy: number
  color: string
  pulsing?: boolean
  duration?: number
  delay?: number
}) {
  if (pulsing) {
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={3}
        fill={color}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    )
  }
  return <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.95} />
}

export function EnterpriseAIPipeline() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [simulations, setSimulations] = useState(5000)

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2800)

    const simInterval = setInterval(() => {
      setSimulations((prev) => prev + 12)
    }, 6000)

    return () => {
      clearInterval(messageInterval)
      clearInterval(simInterval)
    }
  }, [])

  // Node geometries in 580x172 coordinate space:
  // Node 1: x:14..116 (center 65, right 116, y=88)
  // Node 2: x:154..268 (center 211, right 268, y=88)
  // Node 3: x:306..418 (center 362, right 418, y=88)
  // Outputs: x:454..570, centers at y=50, y=88, y=126
  const paths = {
    p1: "M116,88 L154,88",
    p2: "M268,88 L306,88",
    p3: "M418,88 C434,88 442,50 454,50",
    p4: "M418,88 L454,88",
    p5: "M418,88 C434,88 442,126 454,126",
  }

  return (
    <div className="bg-[#111114] border border-white/[0.09] dark:border-emerald-500/25 rounded-2xl overflow-hidden font-sans w-full max-w-[640px] mx-auto shadow-2xl relative text-slate-100">
      {/* Top ambient highlight line */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      {/* Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] flex items-center justify-between bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10.5px] font-bold text-emerald-400/90 tracking-[0.12em] font-mono uppercase">
            FINANCIAL PIPELINE ? REAL-TIME
          </span>
        </div>
        <span className="text-[10px] text-white/40 font-mono">
          0 LLM Math ? 100% Deterministic
        </span>
      </div>

      {/* SVG Pipeline Visualization */}
      <div className="p-2 sm:p-3 overflow-x-auto">
        <svg width="100%" viewBox="0 0 580 172" className="block select-none min-w-[540px]">
          <defs>
            <marker
              id="pipeline-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path
                d="M2 1.5L7.5 5L2 8.5"
                fill="none"
                stroke="rgba(16,185,129,0.55)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>

            <linearGradient id="engineGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Connection Paths */}
          <path
            d={paths.p1}
            fill="none"
            stroke="rgba(16,185,129,0.25)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            markerEnd="url(#pipeline-arrow)"
          />
          <path
            d={paths.p2}
            fill="none"
            stroke="rgba(16,185,129,0.25)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            markerEnd="url(#pipeline-arrow)"
          />
          <path
            d={paths.p3}
            fill="none"
            stroke="rgba(16,185,129,0.2)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
          <path
            d={paths.p4}
            fill="none"
            stroke="rgba(16,185,129,0.2)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
          <path
            d={paths.p5}
            fill="none"
            stroke="rgba(16,185,129,0.2)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />

          {/* Animated dots along paths */}
          <AnimatedDot path={paths.p1} duration={1.1} delay={0} size={2.5} opacity={1} />
          <AnimatedDot path={paths.p1} duration={1.1} delay={0.35} size={1.8} opacity={0.65} />
          <AnimatedDot path={paths.p1} duration={1.1} delay={0.7} size={1.3} opacity={0.35} />

          <AnimatedDot path={paths.p2} duration={0.9} delay={0.15} size={2.5} opacity={1} />
          <AnimatedDot path={paths.p2} duration={0.9} delay={0.6} size={1.8} opacity={0.65} />

          <AnimatedDot path={paths.p3} duration={1.3} delay={0.1} size={2.2} opacity={0.9} />
          <AnimatedDot path={paths.p3} duration={1.3} delay={0.65} size={1.5} opacity={0.55} />

          <AnimatedDot path={paths.p4} duration={1.15} delay={0.25} size={2.2} opacity={0.9} />
          <AnimatedDot path={paths.p4} duration={1.15} delay={0.8} size={1.5} opacity={0.55} />

          <AnimatedDot path={paths.p5} duration={1.4} delay={0.4} size={2.2} opacity={0.9} />
          <AnimatedDot path={paths.p5} duration={1.4} delay={0.95} size={1.5} opacity={0.55} />

          {/* 1. Trigger / Ingestion Node */}
          <rect
            x="14"
            y="66"
            width="102"
            height="44"
            rx="8"
            fill="#161619"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1"
          />
          <text
            x="65"
            y="81"
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(255,255,255,0.4)"
            fontFamily="system-ui"
            letterSpacing=".07em"
            fontWeight="600"
          >
            TRIGGER
          </text>
          <text
            x="65"
            y="98"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(255,255,255,0.9)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            Query / CSV
          </text>
          <text
            x="65"
            y="122"
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.22)"
            fontFamily="monospace"
          >
            hdfc ? sbi ? icici
          </text>

          {/* 2. Reconciliation & Sufficiency Node */}
          <rect
            x="154"
            y="66"
            width="114"
            height="44"
            rx="8"
            fill="#161619"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1"
          />
          <text
            x="211"
            y="81"
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(255,255,255,0.4)"
            fontFamily="system-ui"
            letterSpacing=".07em"
            fontWeight="600"
          >
            DATA GATE
          </text>
          <text
            x="211"
            y="98"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(255,255,255,0.9)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            Reconciliation
          </text>
          <text
            x="211"
            y="122"
            textAnchor="middle"
            fontSize="8"
            fill="rgba(52,211,153,0.7)"
            fontFamily="monospace"
          >
            4/4 passed ? ?=0
          </text>

          {/* 3. Core Deterministic Engine Node */}
          <rect
            x="306"
            y="53"
            width="112"
            height="70"
            rx="10"
            fill="url(#engineGlow)"
            stroke="#10b981"
            strokeWidth="1.2"
          />
          <rect x="320" y="53.5" width="84" height="1.5" rx="0.75" fill="rgba(52,211,153,0.8)" />
          <text
            x="362"
            y="73"
            textAnchor="middle"
            fontSize="8"
            fill="rgba(52,211,153,0.95)"
            fontFamily="system-ui"
            letterSpacing=".08em"
            fontWeight="700"
          >
            DETERMINISTIC MATH
          </text>
          <text
            x="362"
            y="91"
            textAnchor="middle"
            fontSize="12.5"
            fill="#ffffff"
            fontFamily="system-ui"
            fontWeight="600"
          >
            Monte Carlo
          </text>
          <PulsingDot cx={350} cy={104} color="#34d399" duration={1.2} delay={0} />
          <PulsingDot cx={362} cy={104} color="#34d399" duration={1.2} delay={0.4} />
          <PulsingDot cx={374} cy={104} color="#34d399" duration={1.2} delay={0.8} />
          <text
            x="362"
            y="139"
            textAnchor="middle"
            fontSize="8"
            fill="rgba(52,211,153,0.65)"
            fontFamily="monospace"
          >
            5,000 runs ? seed:42
          </text>

          {/* 4a. Output Node: Reasoning Ledger */}
          <rect
            x="454"
            y="35"
            width="116"
            height="30"
            rx="7"
            fill="#161619"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <text
            x="498"
            y="53.5"
            textAnchor="middle"
            fontSize="10.5"
            fill="rgba(255,255,255,0.78)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            Reasoning Ledger
          </text>
          <StatusIndicator cx={556} cy={50} color="#10b981" />

          {/* 4b. Output Node: Number Guard */}
          <rect
            x="454"
            y="73"
            width="116"
            height="30"
            rx="7"
            fill="#161619"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <text
            x="498"
            y="91.5"
            textAnchor="middle"
            fontSize="10.5"
            fill="rgba(255,255,255,0.78)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            Number Guard
          </text>
          <StatusIndicator cx={556} cy={88} color="#10b981" pulsing duration={1.8} />

          {/* 4c. Output Node: Affordability Headroom */}
          <rect
            x="454"
            y="111"
            width="116"
            height="30"
            rx="7"
            fill="#161619"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <text
            x="498"
            y="129.5"
            textAnchor="middle"
            fontSize="10.5"
            fill="rgba(255,255,255,0.78)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            Verified Headroom
          </text>
          <StatusIndicator cx={556} cy={126} color="#34d399" pulsing duration={2.1} delay={0.3} />
        </svg>
      </div>

      {/* Message Ticker Display */}
      <div className="border-t border-white/[0.06] px-4 sm:px-5 py-2.5 h-[54px] bg-black/20 flex items-center">
        <div className="flex gap-2.5 items-center w-full overflow-hidden">
          <span className="text-emerald-400 font-mono text-[14px] leading-none shrink-0 font-bold">
            ?
          </span>
          <div className="relative flex-1 overflow-hidden h-[38px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={messageIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
                className="font-mono text-[11px] sm:text-[11.5px] text-white/75 leading-tight truncate w-full"
                title={messages[messageIndex]}
              >
                {messages[messageIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="border-t border-white/[0.06] px-4 sm:px-5 py-3 flex flex-wrap gap-4 sm:gap-6 items-center bg-black/40 text-xs">
        <div>
          <div className="text-[9px] text-white/35 font-mono tracking-[0.1em] uppercase mb-[2px]">SIMULATIONS</div>
          <motion.div
            key={simulations}
            initial={{ scale: 1.04 }}
            animate={{ scale: 1 }}
            className="text-[15px] text-white font-mono font-semibold"
          >
            {simulations.toLocaleString()} paths
          </motion.div>
        </div>

        <div>
          <div className="text-[9px] text-white/35 font-mono tracking-[0.1em] uppercase mb-[2px]">DRIFT TOLERANCE</div>
          <div className="text-[15px] text-emerald-400 font-mono font-semibold">0.00 Paise</div>
        </div>

        <div>
          <div className="text-[9px] text-white/35 font-mono tracking-[0.1em] uppercase mb-[2px]">BUFFER FLOOR</div>
          <div className="text-[15px] text-white/90 font-mono font-semibold">?58,000</div>
        </div>

        <div className="ml-auto text-right">
          <div className="text-[9px] text-white/35 font-mono tracking-[0.1em] uppercase mb-[2px]">ENGINE CORE</div>
          <div className="text-[11px] text-emerald-400/90 font-mono font-medium">Deterministic ? Local SQLite</div>
        </div>
      </div>
    </div>
  )
}

export default EnterpriseAIPipeline

export function EnterpriseAIPipelineDemo() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center bg-black/90 p-4 sm:p-8 rounded-2xl">
      <EnterpriseAIPipeline />
    </div>
  )
}
