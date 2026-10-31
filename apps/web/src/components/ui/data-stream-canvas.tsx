'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme as useAppTheme } from '@/components/theme-context';

export interface DataStreamCanvasProps {
  progress: number; // 0 to 1
  statusMessage?: string;
  srcLabel?: string;
  dstLabel?: string;
  color?: string;
  accentColor?: string;
  className?: string;
}

export const DataStreamCanvas: React.FC<DataStreamCanvasProps> = ({
  progress,
  statusMessage,
  srcLabel = 'STATEMENT.CSV',
  dstLabel = 'LOCAL SQLITE (FDL.DB)',
  color,
  accentColor,
  className = '',
}) => {
  let isLight = false;
  try {
    const themeContext = useAppTheme();
    isLight = !themeContext.isDark;
  } catch {
    isLight = false;
  }

  const primaryColor = color || (isLight ? '#059669' : '#10b981');
  const primaryAccent = accentColor || (isLight ? '#047857' : '#34d399');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<DataStream | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ds = new DataStream(canvasRef.current, {
      color: primaryColor,
      accentColor: primaryAccent,
      outline: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
      track: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
      text: isLight ? '#64748b' : '#94a3b8',
      srcLabel: srcLabel.toUpperCase(),
      dstLabel: dstLabel.toUpperCase(),
      statusMessage: statusMessage || '',
    });

    streamRef.current = ds;

    return () => {
      ds.destroy();
      streamRef.current = null;
    };
  }, [primaryColor, primaryAccent, isLight, srcLabel, dstLabel]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.setProgress(progress, 1);
    }
  }, [progress]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.setLabels(srcLabel.toUpperCase(), dstLabel.toUpperCase());
    }
  }, [srcLabel, dstLabel]);

  return (
    <div
      className={`relative w-full rounded-2xl border border-border bg-card overflow-hidden shadow-xs transition-colors ${className}`}
    >
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              progress > 0 && progress < 1
                ? 'bg-emerald-500 animate-pulse'
                : progress >= 1
                ? 'bg-emerald-500'
                : 'bg-muted-foreground/40'
            }`}
            style={progress > 0 ? { boxShadow: '0 0 8px rgba(16,185,129,0.7)' } : undefined}
          />
          <span className="font-bold uppercase tracking-tight text-foreground text-xs sm:text-sm">
            {statusMessage
              ? `STATUS // ${statusMessage}`
              : progress >= 1
              ? 'STATUS // INGESTION COMPLETE [RECONCILED Δ = 0]'
              : progress > 0
              ? 'STATUS // STREAMING TRANSACTIONS ACTIVE'
              : 'STATUS // CONDUIT STANDBY · LOCAL AIR-GAP'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground uppercase tracking-wider text-[10.5px]">
          <span className="hidden sm:inline">
            ENGINE: <strong className="text-emerald-600 dark:text-emerald-400">IN-MEMORY RECONCILER</strong>
          </span>
          <span>
            PIPELINE: <strong className="text-foreground">PAISE PRECISION</strong>
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full block h-[210px] sm:h-[230px] bg-background/50"
      />
    </div>
  );
};

export interface DataStreamOptions {
  color?: string;
  accentColor?: string;
  outline?: string;
  track?: string;
  text?: string;
  srcLabel?: string;
  dstLabel?: string;
  statusMessage?: string;
}

interface Particle {
  u: number;
  dur: number;
  o: number;
  w: number;
  ph: number;
}

export class DataStream {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  o: Required<DataStreamOptions>;
  target: number;
  p: number;
  v: number;
  parts: Particle[];
  acc: number;
  t: number;
  doneAt: number | null;
  last: number;
  reduced: boolean;
  ro: ResizeObserver;
  raf: number;
  w: number = 600;
  h: number = 260;

  constructor(canvas: HTMLCanvasElement, options: DataStreamOptions = {}) {
    this.c = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D rendering context');
    this.x = ctx;
    this.o = {
      color: '#10b981',
      accentColor: '#34d399',
      outline: 'rgba(128,128,128,.35)',
      track: 'rgba(128,128,128,.15)',
      text: '#888780',
      srcLabel: 'STATEMENT.CSV',
      dstLabel: 'LOCAL SQLITE (FDL.DB)',
      statusMessage: '',
      ...options,
    };
    this.target = 0;
    this.p = 0;
    this.v = 0;
    this.parts = [];
    this.acc = 0;
    this.t = 0;
    this.doneAt = null;
    this.last = performance.now();
    this.reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  setProgress(loaded: number, total: number = 1) {
    this.target = total > 0 ? Math.max(0, Math.min(1, loaded / total)) : 0;
  }

  setLabels(src: string, dst: string) {
    this.o.srcLabel = src;
    this.o.dstLabel = dst;
  }

  setStatusMessage(msg: string) {
    this.o.statusMessage = msg;
  }

  reset() {
    this.target = this.p = this.v = 0;
    this.parts = [];
    this.doneAt = null;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
  }

  resize() {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.w = this.c.clientWidth || 600;
    this.h = this.c.clientHeight || 260;
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;

    const prev = this.p;
    this.p += (this.target - this.p) * (1 - Math.exp(-dt * 8));
    if (this.target - this.p < 0.0005) this.p = this.target;
    if (dt > 0) this.v += ((this.p - prev) / dt - this.v) * 0.1;
    if (this.p >= 1 && this.doneAt === null) this.doneAt = this.t;
    if (this.p < 1) this.doneAt = null;

    if (!this.reduced && this.p < 1 && this.v > 0.001) {
      this.acc += dt * Math.min(18, 3 + this.v * 60);
      while (this.acc >= 1) {
        this.acc -= 1;
        this.parts.push({
          u: 0,
          dur: 1.4 + Math.random() * 1.0,
          o: (Math.random() - 0.5) * 2,
          w: 13 + Math.random() * 9,
          ph: Math.random() * 6.28,
        });
      }
    }
    for (const q of this.parts) q.u += dt / q.dur;
    this.parts = this.parts.filter((q) => q.u < 1);

    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  filePath(w: number) {
    const x = this.x,
      h = w * 1.25,
      f = w * 0.32;
    x.beginPath();
    x.moveTo(-w / 2, -h / 2);
    x.lineTo(w / 2 - f, -h / 2);
    x.lineTo(w / 2, -h / 2 + f);
    x.lineTo(w / 2, h / 2);
    x.lineTo(-w / 2, h / 2);
    x.closePath();
  }

  grid(w: number, color: string) {
    const x = this.x,
      h = w * 1.25,
      gx = w * 0.28,
      y0 = -h * 0.02,
      y1 = h * 0.3;
    x.strokeStyle = color;
    x.lineWidth = Math.max(1, w * 0.06);
    x.lineJoin = 'round';
    x.strokeRect(-gx, y0, gx * 2, y1 - y0);
    x.beginPath();
    x.moveTo(0, y0);
    x.lineTo(0, y1);
    x.moveTo(-gx, (y0 + y1) / 2);
    x.lineTo(gx, (y0 + y1) / 2);
    x.stroke();
  }

  fold(w: number) {
    const x = this.x,
      h = w * 1.25,
      f = w * 0.32,
      a = x.globalAlpha;
    x.fillStyle = '#fff';
    x.globalAlpha = a * 0.4;
    x.beginPath();
    x.moveTo(w / 2 - f, -h / 2);
    x.lineTo(w / 2 - f, -h / 2 + f);
    x.lineTo(w / 2, -h / 2 + f);
    x.closePath();
    x.fill();
    x.globalAlpha = a;
  }

  sheetIcon(cx: number, cy: number, w: number, alpha: number, rot: number) {
    const x = this.x;
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    x.globalAlpha = alpha;
    x.fillStyle = this.o.color;
    this.filePath(w);
    x.fill();
    this.fold(w);
    this.grid(w, '#fff');
    x.restore();
  }

  bigSheet(cx: number, cy: number, w: number, frac: number, scale: number = 1) {
    const x = this.x,
      h = w * 1.25,
      f = w * 0.32,
      o = this.o;
    x.save();
    x.translate(cx, cy);
    x.scale(scale, scale);

    this.filePath(w);
    x.fillStyle = o.track;
    x.fill();
    this.grid(w, o.outline);

    x.save();
    this.filePath(w);
    x.clip();
    x.beginPath();
    x.rect(-w / 2, h / 2 - h * frac, w, h * frac);
    x.clip();
    x.fillStyle = o.color;
    x.fillRect(-w / 2, -h / 2, w, h);
    this.fold(w);
    this.grid(w, '#fff');
    x.restore();

    this.filePath(w);
    x.lineWidth = 1.8;
    x.strokeStyle = o.outline;
    x.stroke();
    x.beginPath();
    x.moveTo(w / 2 - f, -h / 2);
    x.lineTo(w / 2 - f, -h / 2 + f);
    x.lineTo(w / 2, -h / 2 + f);
    x.stroke();
    x.restore();
  }

  label(s: string, px: number, py: number) {
    const x = this.x;
    x.fillStyle = this.o.text;
    x.font = '600 11px JetBrains Mono, monospace, system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(s, px, py);
  }

  draw() {
    const x = this.x,
      { w, h, p, o } = this;
    x.clearRect(0, 0, w, h);

    const y = h * 0.42,
      xa = w * 0.16,
      xb = w * 0.84;
    const iw = Math.min(56, h * 0.23);
    const laneA = xa + iw * 0.7,
      laneB = xb - iw * 0.7;
    const spread = Math.min(24, h * 0.1);

    const pulse = this.doneAt === null ? 0 : Math.exp(-(this.t - this.doneAt) * 5) * 0.12;

    this.bigSheet(xa, y, iw, 1 - p);
    this.bigSheet(xb, y, iw, p, 1 + pulse);

    for (const q of this.parts) {
      const s = Math.sin(q.u * Math.PI);
      const px = laneA + q.u * (laneB - laneA);
      const py = y + q.o * spread * s + Math.sin(q.u * 9 + q.ph) * 5;
      this.sheetIcon(px, py, q.w * (0.6 + 0.4 * s), Math.min(1, s * 1.6), Math.sin(q.u * 6 + q.ph) * 0.35);
    }

    // progress bar
    const bx = w * 0.18,
      bw = w * 0.64,
      by = h * 0.83;
    x.fillStyle = o.track;
    x.beginPath();
    x.roundRect(bx, by, bw, 7, 3.5);
    x.fill();
    x.fillStyle = o.color;
    x.beginPath();
    x.roundRect(bx, by, Math.max(7, bw * p), 7, 3.5);
    x.fill();

    const ly = y + iw * 0.625 + 18;
    this.label(o.srcLabel, xa, ly);
    this.label(o.dstLabel, xb, ly);
  }
}

export default DataStreamCanvas;
