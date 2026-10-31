'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { formatINR } from '@fdl/shared';
import { TrendingDown, ShieldAlert, Calendar } from 'lucide-react';

interface TimelinePoint {
  date: string;
  p10_paise: number;
  p50_paise: number;
  p90_paise: number;
}

interface CashHorizonChartProps {
  timeline: TimelinePoint[];
  bufferPaise: number;
  lowestBalance: {
    date: string;
    p50_minor: number;
    p10_minor: number;
    day_index?: number;
  };
  purchaseAmountPaise: number;
  label?: string;
}

export default function CashHorizonChart({
  timeline,
  bufferPaise,
  lowestBalance,
  purchaseAmountPaise,
  label = 'Purchase',
}: CashHorizonChartProps) {
  if (!timeline || timeline.length === 0) return null;

  // Format data for Recharts (convert paise to rupees for clean Y-axis)
  const chartData = timeline.map((pt) => ({
    date: pt.date.slice(5), // MM-DD
    fullDate: pt.date,
    p10: Math.round(pt.p10_paise / 100),
    p50: Math.round(pt.p50_paise / 100),
    p90: Math.round(pt.p90_paise / 100),
    p10_paise: pt.p10_paise,
    p50_paise: pt.p50_paise,
    p90_paise: pt.p90_paise,
  }));

  const bufferRupees = Math.round(bufferPaise / 100);
  const lowestRupees = Math.round(lowestBalance.p50_minor / 100);

  // Find min/max for YAxis domain with headroom
  const allValues = chartData.flatMap((d) => [d.p10, d.p50, d.p90, bufferRupees]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const yMin = Math.floor(Math.min(0, minValue * 0.9));
  const yMax = Math.ceil(maxValue * 1.1);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            <span>45-Day Cash-Flow Horizon & Liquidity Drawdown</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            5,000 Monte Carlo daily trajectory simulations showing P10 (conservative), P50 (expected), and P90 (optimistic) bounds.
          </p>
        </div>

        {/* Legend Badges */}
        <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-muted-foreground">Confidence Band</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-sky-500" />
            <span className="text-sky-600 dark:text-sky-400 font-semibold">P90 Optimistic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-emerald-500" />
            <span className="text-foreground font-semibold">P50 Expected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-amber-500" />
            <span className="text-amber-600 dark:text-amber-400 font-semibold">P10 Conservative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-rose-500" />
            <span className="text-rose-500 font-semibold">Buffer Floor ({formatINR(bufferPaise)})</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
            <defs>
              <linearGradient id="horizonConfidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />

            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}k`}`}
              domain={[yMin, yMax]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border p-3.5 rounded-xl shadow-xl font-mono text-xs space-y-2 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="text-foreground font-bold font-sans text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {d.fullDate}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4 text-sky-600 dark:text-sky-400">
                        <span className="text-muted-foreground font-sans">P90 (Optimistic):</span>
                        <span className="font-bold">{formatINR(d.p90_paise)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                        <span className="text-muted-foreground font-sans">P50 (Expected):</span>
                        <span className="font-bold">{formatINR(d.p50_paise)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400">
                        <span className="text-muted-foreground font-sans">P10 (Conservative):</span>
                        <span className="font-bold">{formatINR(d.p10_paise)}</span>
                      </div>
                      <div className="pt-1.5 border-t border-border flex items-center justify-between gap-4 text-rose-500">
                        <span className="text-muted-foreground font-sans">Buffer:</span>
                        <span className="font-bold">{formatINR(bufferPaise)}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Red Dashed Safety Buffer Floor Line */}
            <ReferenceLine
              y={bufferRupees}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Buffer: ₹${bufferRupees.toLocaleString('en-IN')}`,
                position: 'right',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            />

            {/* Zero balance danger line if lowest goes negative */}
            {yMin < 0 && (
              <ReferenceLine
                y={0}
                stroke="#dc2626"
                strokeWidth={2}
                label={{
                  value: 'Zero Balance (Overdraft)',
                  position: 'insideBottomLeft',
                  fill: '#dc2626',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />
            )}

            {/* Confidence Band Area under P90 curve */}
            <Area
              type="monotone"
              dataKey="p90"
              stroke="none"
              fill="url(#horizonConfidenceGrad)"
              fillOpacity={1}
            />

            {/* P90 Optimistic Line (Sky / Blue) */}
            <Line
              type="monotone"
              dataKey="p90"
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="P90 (Optimistic)"
            />

            {/* P50 Expected Trajectory Curve (Vibrant Theme Emerald) */}
            <Line
              type="monotone"
              dataKey="p50"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--chart-1)', stroke: 'var(--card)', strokeWidth: 2 }}
              name="P50 (Expected)"
            />

            {/* P10 Conservative Line (Amber) */}
            <Line
              type="monotone"
              dataKey="p10"
              stroke="var(--chart-4)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="P10 (Conservative)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Trajectory Insights Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
        <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              Maximum Drawdown Date
            </span>
            <span className="font-mono font-bold text-foreground">
              {lowestBalance.date} (Projected ₹{lowestRupees.toLocaleString('en-IN')})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              Buffer Compliance
            </span>
            <span className="font-mono font-bold text-foreground">
              {lowestBalance.p50_minor >= bufferPaise ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Maintains +{formatINR(lowestBalance.p50_minor - bufferPaise)} cushion
                </span>
              ) : (
                <span className="text-rose-500 dark:text-rose-400">
                  Breaches buffer by {formatINR(bufferPaise - lowestBalance.p50_minor)}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
