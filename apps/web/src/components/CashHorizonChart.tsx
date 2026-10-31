'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { formatINR, paiseToRupees } from '@fdl/shared';
import { TrendingDown, ShieldAlert, Sparkles, Calendar } from 'lucide-react';

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
            <span className="w-2.5 h-2.5 rounded-xs bg-primary/20 border border-primary/50" />
            <span className="text-muted-foreground">P10-P90 Confidence Band</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-primary" />
            <span className="text-foreground font-semibold">P50 Expected Curve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-destructive border-b border-dashed border-destructive" />
            <span className="text-destructive font-semibold">Buffer Floor ({formatINR(bufferPaise)})</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />

            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />

            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              domain={[yMin, yMax]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border p-3 rounded-xl shadow-lg font-mono text-xs space-y-1.5">
                    <p className="text-foreground font-bold font-sans text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {d.fullDate}
                    </p>
                    <div className="pt-1 border-t border-border space-y-1">
                      <p className="text-emerald-500 flex justify-between gap-4">
                        <span className="text-muted-foreground font-sans">P90 (Optimistic):</span>
                        <span className="font-bold">{formatINR(d.p90_paise)}</span>
                      </p>
                      <p className="text-primary flex justify-between gap-4">
                        <span className="text-muted-foreground font-sans">P50 (Expected):</span>
                        <span className="font-bold">{formatINR(d.p50_paise)}</span>
                      </p>
                      <p className="text-amber-500 flex justify-between gap-4">
                        <span className="text-muted-foreground font-sans">P10 (Conservative):</span>
                        <span className="font-bold">{formatINR(d.p10_paise)}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />

            {/* Red Dashed Safety Buffer Floor Line */}
            <ReferenceLine
              y={bufferRupees}
              stroke="hsl(var(--destructive))"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Buffer: ₹${bufferRupees.toLocaleString()}`,
                position: 'right',
                fill: 'hsl(var(--destructive))',
                fontSize: 10,
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            />

            {/* Zero balance danger line if lowest goes negative */}
            {yMin < 0 && (
              <ReferenceLine
                y={0}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                label={{
                  value: 'Zero Balance (Overdraft)',
                  position: 'insideBottomLeft',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 10,
                }}
              />
            )}

            {/* Confidence Band (P10 to P90) */}
            <Area
              type="monotone"
              dataKey="p90"
              stroke="transparent"
              fill="url(#confidenceArea)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="p10"
              stroke="transparent"
              fill="hsl(var(--card))"
              fillOpacity={1}
            />

            {/* Expected Trajectory Line (P50) */}
            <Area
              type="monotone"
              dataKey="p50"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="transparent"
              dot={false}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </AreaChart>
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
              {lowestBalance.date} (Projected ₹{lowestRupees.toLocaleString()})
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
                <span className="text-destructive">
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
