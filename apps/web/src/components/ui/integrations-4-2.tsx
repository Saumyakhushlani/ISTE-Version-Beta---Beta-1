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
	description = "Directly upload and analyze bank statements from PhonePe, Google Pay, Paytm, HDFC, SBI, ICICI, Axis, Kotak, and CRED — zero cloud transmission, 100% deterministic local math.",
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
				"absolute flex w-[68px] h-[68px] items-center justify-center rounded-2xl border transition-all duration-300 hover:scale-110 hover:border-emerald-500/60 hover:shadow-lg hover:z-20 overflow-hidden",
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
						"pointer-events-none w-11 h-11 select-none object-contain rounded-xl p-0.5 transition-transform",
						logo.isInvertable && "dark:invert"
					)}
					height={44}
					src={logo.src}
					width={44}
				/>
			)}
		</div>
	);
}

// 5x5 Grid Scattered Coordinate Mapping with Actual Bank & Payment Logos from /public
export const tiles: TileData[] = [
	// Row 0
	{ row: 0, col: 1 },
	{
		row: 0,
		col: 3,
		logo: {
			src: "/phonepe.jpg",
			alt: "PhonePe",
		},
	},

	// Row 1
	{ row: 1, col: 0 },
	{
		row: 1,
		col: 2,
		logo: {
			src: "/gpay.webp",
			alt: "Google Pay",
		},
	},
	{
		row: 1,
		col: 4,
		logo: {
			src: "/paytm.png",
			alt: "Paytm",
		},
	},

	// Row 2
	{
		row: 2,
		col: 1,
		logo: {
			src: "/hdfc.jpg",
			alt: "HDFC Bank",
		},
	},
	{
		row: 2,
		col: 3,
		logo: {
			src: "/sbi.jpg",
			alt: "State Bank of India",
		},
	},

	// Row 3
	{ row: 3, col: 0 },
	{
		row: 3,
		col: 2,
		logo: {
			src: "/icici.png",
			alt: "ICICI Bank",
		},
	},
	{
		row: 3,
		col: 4,
		logo: {
			src: "/axis.png",
			alt: "Axis Bank",
		},
	},

	// Row 4
	{
		row: 4,
		col: 1,
		logo: {
			src: "/kotak.png",
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
