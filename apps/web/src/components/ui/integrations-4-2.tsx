'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Building2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
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
	title = "Multi-Bank & UPI Integration",
	description = "Direct, local-first statement ingestion and analysis across PhonePe, Google Pay, Paytm, HDFC, SBI, ICICI, and Axis — zero data leakage, 100% deterministic math.",
	customTiles,
}: IntegrationsProps) {
	const activeTiles = customTiles || tiles;

	return (
		<div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 p-6 md:grid-cols-2 md:items-center">
			{/* Left Content */}
			<div className="max-w-xl space-y-5">
				<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
					<Building2 className="w-3.5 h-3.5" />
					<span>Universal Bank & Payment Gateway Engine</span>
				</div>
				<h2 className="font-semibold text-3xl text-foreground tracking-tight sm:text-4xl md:text-5xl leading-tight">
					{title}
				</h2>
				<p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
					{description}
				</p>
				<div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<ShieldCheck className="w-4 h-4 text-emerald-500" />
						<span>Offline Client-Side Parsing</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Sparkles className="w-4 h-4 text-primary" />
						<span>90-Day Headroom Prediction</span>
					</div>
				</div>
				<div className="pt-3">
					<Link
						href="/upload"
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition"
					>
						Upload Your Statement
						<ArrowRight className="w-3.5 h-3.5" />
					</Link>
				</div>
			</div>

			{/* Right Content - Visual Scattered Grid */}
			<div className="flex justify-center md:justify-end">
				<div 
					className="relative w-[360px] h-[360px] [mask-image:radial-gradient(ellipse_at_center,black_65%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_65%,transparent_100%)]"
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
				"absolute flex w-[68px] h-[68px] items-center justify-center rounded-xl border transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-md",
				logo
					? "bg-card shadow-sm dark:bg-card/70 border-border"
					: "bg-secondary/20 dark:bg-muted/10 border-border/40" // Empty tile placeholder
			)}
			style={{
				left: col * 72, // 72px coordinate step
				top: row * 72,
			}}
		>
			{logo && (
				<img
					alt={logo.alt}
					className={cn(
						"pointer-events-none w-9 h-9 select-none object-contain p-1",
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

// 5x5 Grid Scattered Coordinate Mapping tailored with Indian Banking, UPI & Statement Analysis Logos
export const defaultIndianFinanceTiles: TileData[] = [
	// Row 0
	{ row: 0, col: 1 }, // Empty balance node
	{
		row: 0,
		col: 3,
		logo: {
			// PhonePe Logo SVG
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%235f259f'/><path d='M42 22h14c12 0 20 8 20 18s-8 18-20 18H50v22H42V22zm8 8v20h6c7 0 12-4 12-10s-5-10-12-10h-6z' fill='white'/><path d='M30 42l16 36h-9L23 44l7-2z' fill='%23673ab7'/></svg>",
			alt: "PhonePe",
		},
	},

	// Row 1
	{ row: 1, col: 0 },
	{
		row: 1,
		col: 2,
		logo: {
			// Google Pay (GPay) Logo SVG
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='white'/><path d='M49 41v18h25c-1 6-7 18-25 18-15 0-27-12-27-27s12-27 27-27c8 0 14 3 17 6l13-13C71 9 61 5 49 5 25 5 5 25 5 50s20 45 44 45c25 0 42-18 42-43 0-3 0-6-1-11H49z' fill='%234285F4'/><path d='M9 36l15 11c4-11 15-18 25-18 8 0 14 3 17 6l13-13C71 9 61 5 49 5 32 5 18 17 9 36z' fill='%23EA4335'/><path d='M49 95c12 0 22-4 30-12l-14-12c-4 3-9 5-16 5-18 0-24-12-25-18L9 64c9 19 23 31 40 31z' fill='%2334A853'/><path d='M24 58c-1-3-1-6-1-8s0-5 1-8L9 36C5 44 5 56 9 64l15-6z' fill='%23FBBC05'/></svg>",
			alt: "Google Pay",
		},
	},
	{
		row: 1,
		col: 4,
		logo: {
			// Paytm Logo SVG
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%23002e6e'/><text x='50' y='60' font-family='Arial, sans-serif' font-weight='900' font-size='22' fill='%2300b9f5' text-anchor='middle'>Pay<tspan fill='white'>tm</tspan></text></svg>",
			alt: "Paytm",
		},
	},

	// Row 2
	{
		row: 2,
		col: 1,
		logo: {
			// HDFC Bank Logo SVG
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%23004b8d'/><rect x='22' y='22' width='56' height='56' fill='none' stroke='%23ed1c24' stroke-width='14'/><rect x='38' y='38' width='24' height='24' fill='white'/><rect x='44' y='14' width='12' height='72' fill='%23004b8d'/><rect x='14' y='44' width='72' height='12' fill='%23004b8d'/></svg>",
			alt: "HDFC Bank",
		},
	},
	{
		row: 2,
		col: 3,
		logo: {
			// State Bank of India (SBI) Logo SVG
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%2300a4e4'/><circle cx='50' cy='50' r='30' fill='white'/><circle cx='50' cy='46' r='10' fill='%2300a4e4'/><rect x='46' y='46' width='8' height='26' fill='%2300a4e4'/></svg>",
			alt: "State Bank of India",
		},
	},

	// Row 3
	{ row: 3, col: 0 },
	{
		row: 3,
		col: 2,
		logo: {
			// ICICI Bank Logo SVG
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%23b02a30'/><circle cx='50' cy='50' r='28' fill='none' stroke='%23f37024' stroke-width='8'/><path d='M44 32h12v36H44z' fill='white'/><circle cx='50' cy='24' r='6' fill='%23f37024'/></svg>",
			alt: "ICICI Bank",
		},
	},
	{
		row: 3,
		col: 4,
		logo: {
			// Axis Bank Logo SVG
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%2397144d'/><polygon points='50,20 80,78 20,78' fill='white'/><polygon points='50,42 66,74 34,74' fill='%2397144d'/></svg>",
			alt: "Axis Bank",
		},
	},

	// Row 4
	{
		row: 4,
		col: 1,
		logo: {
			// Bank Data & Cash Flow Analysis
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%230f172a'/><path d='M25 70L42 50L56 60L75 32' fill='none' stroke='%2310b981' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'/><circle cx='75' cy='32' r='6' fill='%2310b981'/></svg>",
			alt: "Deterministic Cash Flow Analytics",
		},
	},
	{
		row: 4,
		col: 3,
		logo: {
			// Reasoning Ledger Audit Trail
			src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%231e293b'/><rect x='26' y='24' width='48' height='52' rx='6' fill='none' stroke='%2338bdf8' stroke-width='6'/><line x1='36' y1='38' x2='64' y2='38' stroke='%2338bdf8' stroke-width='5' stroke-linecap='round'/><line x1='36' y1='50' x2='56' y2='50' stroke='%2338bdf8' stroke-width='5' stroke-linecap='round'/><line x1='36' y1='62' x2='60' y2='62' stroke='%2338bdf8' stroke-width='5' stroke-linecap='round'/></svg>",
			alt: "Reasoning Ledger",
		},
	},
];

// Fallback to the requested finance tiles
const tiles: TileData[] = defaultIndianFinanceTiles;

export default Integrations;
