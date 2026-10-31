'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Building2, ShieldCheck, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export type LogoType = {
	src: string;
	alt: string;
	isInvertable?: boolean;
};

export type TileData = {
	row: number;
	col: number;
	logo?: LogoType;
};

interface IntegrationsProps {
	title?: string;
	description?: string;
	customTiles?: TileData[];
}

export function Integrations({
	title = "Universal Bank & Payment Ingestion",
	description = "Directly upload and analyze bank statements from PhonePe, Google Pay, Paytm, HDFC, SBI, ICICI, Axis, Kotak, and CRED ? zero cloud transmission, 100% deterministic local math.",
	customTiles,
}: IntegrationsProps) {
	const activeTiles = customTiles || tiles;

	return (
		<div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 p-6 md:grid-cols-2 md:items-center font-sans">
			{/* Left Content */}
			<div className="max-w-xl space-y-6">
				<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
					<Building2 className="w-3.5 h-3.5" />
					<span>Universal Statement Ingestion</span>
				</div>

				<h2 className="font-bold text-3xl text-foreground tracking-tight sm:text-4xl md:text-5xl leading-tight">
					{title}
				</h2>

				<p className="text-base text-muted-foreground leading-relaxed">
					{description}
				</p>

				{/* Feature Checklist */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-foreground">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
						<span>Auto-detects Bank Schemas & Dates</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
						<span>Password-Protected PDF Support</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
						<span>UPI/IMPS Merchant Junk Cleaning</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
						<span>100% Offline Local-First Privacy</span>
					</div>
				</div>

				<div className="pt-4 flex flex-wrap items-center gap-3.5">
					<Link
						href="/upload"
						className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 shadow-sm transition-all active:scale-95 border border-slate-800 dark:border-white/20"
					>
						Upload Your Statement
						<ArrowRight className="w-3.5 h-3.5" />
					</Link>
					<Link
						href="#pipeline"
						className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border text-foreground font-medium text-xs hover:bg-muted transition-all shadow-xs"
					>
						View Live Pipeline
					</Link>
				</div>
			</div>

			{/* Right Content - Visual Scattered Grid with Radial Mask */}
			<div className="flex justify-center md:justify-end">
				<div 
					className="relative w-[360px] h-[360px] [mask-image:radial-gradient(ellipse_at_center,black_65%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_65%,transparent_100%)] select-none"
				>
					{activeTiles.map((tile) => (
						<IntegrationCard key={`${tile.row}_${tile.col}`} {...tile} />
					))}
				</div>
			</div>
		</div>
	);
}

function IntegrationCard({ row, col, logo }: TileData) {
	return (
		<div
			className={cn(
				"absolute flex w-[68px] h-[68px] items-center justify-center rounded-2xl border transition-all duration-300 hover:scale-110 hover:border-emerald-500/60 hover:shadow-lg hover:z-20",
				logo
					? "bg-card shadow-xs dark:bg-card/80 border-border"
					: "bg-muted/30 dark:bg-muted/10 border-border/40"
			)}
			style={{
				left: col * 72,
				top: row * 72,
			}}
		>
			{logo && (
				<img
					alt={logo.alt}
					title={logo.alt}
					className={cn(
						"pointer-events-none w-10 h-10 select-none object-contain p-0.5 rounded-xl transition-transform",
						logo.isInvertable && "dark:invert"
					)}
					height={40}
					src={logo.src}
					width={40}
				/>
			)}
		</div>
	);
}

// 5x5 Grid Scattered Coordinate Mapping with Indian Banking, UPI & Payment Logos
export const tiles: TileData[] = [
	// Row 0
	{ row: 0, col: 1 },
	{
		row: 0,
		col: 3,
		logo: {
			// PhonePe
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%235f259f'/><path fill='%23fff' d='M28.5 13H19.2c-.7 0-1.2.5-1.2 1.2v19.6c0 .7.5 1.2 1.2 1.2h3.6c.7 0 1.2-.5 1.2-1.2v-7.2h4.5c4.8 0 8.7-3.9 8.7-8.7s-3.9-8.7-8.7-8.7zm0 11.4h-4.5v-5.4h4.5c1.5 0 2.7 1.2 2.7 2.7s-1.2 2.7-2.7 2.7z'/><path fill='%23fff' d='M34.8 33.8l-8.4-11.2h-3.6l7.8 10.4c.5.7.5 1.7 0 2.4l-7.8 10.4h3.6l8.4-11.2c.4-.6.4-1.4 0-2z'/></svg>",
			alt: "PhonePe",
		},
	},

	// Row 1
	{ row: 1, col: 0 },
	{
		row: 1,
		col: 2,
		logo: {
			// Google Pay (GPay)
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%23ffffff' stroke='%23e2e8f0' stroke-width='1'/><path fill='%234285F4' d='M24 19.5v5.8h8.3c-.4 2.3-1.6 4.3-3.6 5.6l5.8 4.5c3.4-3.1 5.3-7.8 5.3-13.3 0-1-.1-2.1-.3-3.1L24 19.5z'/><path fill='%2334A853' d='M24 39c4.1 0 7.5-1.3 10-3.6l-5.8-4.5c-1.6 1.1-3.6 1.7-6.2 1.7-4.8 0-8.8-3.2-10.2-7.6L6 29.5C8.5 35.1 15.7 39 24 39z'/><path fill='%23FBBC05' d='M13.8 25c-.4-1.1-.6-2.3-.6-3.5 0-1.2.2-2.4.6-3.5L6 12.5C4.2 16.1 3.2 20.2 3.2 24.5s1 8.4 2.8 12l7.8-5.5z'/><path fill='%23EA4335' d='M24 9.5c2.6 0 5 .9 6.8 2.6l5.1-5.1C32.8 4.2 28.7 2.5 24 2.5 15.7 2.5 8.5 6.4 6 12.5l7.8 5.5c1.4-4.4 5.4-7.6 10.2-7.6z'/></svg>",
			alt: "Google Pay",
		},
	},
	{
		row: 1,
		col: 4,
		logo: {
			// Paytm
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%23002e6e'/><text x='24' y='29' font-family='-apple-system, BlinkMacSystemFont, Arial, sans-serif' font-weight='900' font-size='13' text-anchor='middle'><tspan fill='%2300baf2'>Pay</tspan><tspan fill='%23ffffff'>tm</tspan></text><rect x='12' y='33' width='24' height='2' rx='1' fill='%2300baf2'/></svg>",
			alt: "Paytm",
		},
	},

	// Row 2
	{
		row: 2,
		col: 1,
		logo: {
			// HDFC Bank
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%23004b8d'/><rect x='10' y='10' width='28' height='28' fill='none' stroke='%23ed1c24' stroke-width='7'/><rect x='19' y='19' width='10' height='10' fill='%23ffffff'/><rect x='22' y='6' width='4' height='36' fill='%23004b8d'/><rect x='6' y='22' width='36' height='4' fill='%23004b8d'/></svg>",
			alt: "HDFC Bank",
		},
	},
	{
		row: 2,
		col: 3,
		logo: {
			// State Bank of India (SBI)
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%2300a4e4'/><circle cx='24' cy='24' r='14' fill='%23ffffff'/><circle cx='24' cy='21.5' r='4.5' fill='%2300a4e4'/><rect x='22' y='21.5' width='4' height='12' fill='%2300a4e4'/></svg>",
			alt: "State Bank of India",
		},
	},

	// Row 3
	{ row: 3, col: 0 },
	{
		row: 3,
		col: 2,
		logo: {
			// ICICI Bank
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%239b181e'/><circle cx='24' cy='24' r='13' fill='none' stroke='%23f37024' stroke-width='3.5'/><path d='M21 17h6v14h-6z' fill='%23ffffff'/><circle cx='24' cy='12.5' r='2.5' fill='%23f37024'/></svg>",
			alt: "ICICI Bank",
		},
	},
	{
		row: 3,
		col: 4,
		logo: {
			// Axis Bank
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%2397144d'/><polygon points='24,9 38,39 10,39' fill='%23ffffff'/><polygon points='24,20 31,37 17,37' fill='%2397144d'/></svg>",
			alt: "Axis Bank",
		},
	},

	// Row 4
	{
		row: 4,
		col: 1,
		logo: {
			// Kotak Mahindra Bank
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%23ed1c24'/><path d='M17 18c-3.3 0-6 2.7-6 6s2.7 6 6 6c2.8 0 4.5-1.8 7-4.5 2.5 2.7 4.2 4.5 7 4.5 3.3 0 6-2.7 6-6s-2.7-6-6-6c-2.8 0-4.5 1.8-7 4.5-2.5-2.7-4.2-4.5-7-4.5zm0 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm14 0c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3z' fill='%23ffffff'/></svg>",
			alt: "Kotak Mahindra Bank",
		},
	},
	{
		row: 4,
		col: 3,
		logo: {
			// CRED
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%23000000' stroke='rgba(255,255,255,0.2)' stroke-width='1'/><path d='M14 14h20v20H14z' fill='none' stroke='%23ffffff' stroke-width='2.5'/><path d='M19 19h10v10H19z' fill='%23ffffff'/><circle cx='29' cy='29' r='2' fill='%2310b981'/></svg>",
			alt: "CRED",
		},
	},
];

export default Integrations;
