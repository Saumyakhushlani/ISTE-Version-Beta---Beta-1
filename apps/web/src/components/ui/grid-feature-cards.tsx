import { cn } from '@/lib/utils';
import React from 'react';

export type FeatureType = {
	title: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	description: string;
	badge?: string;
};

export type FeatureCardProps = React.ComponentProps<'div'> & {
	feature: FeatureType;
};

// Backwards-compatible alias for typo in initial spec
export type FeatureCardPorps = FeatureCardProps;

export function FeatureCard({ feature, className, ...props }: FeatureCardProps) {
	// Deterministic pattern based on title to avoid SSR hydration mismatches
	const p = React.useMemo(() => genRandomPattern(feature.title), [feature.title]);

	return (
		<div className={cn('relative overflow-hidden p-6 group transition-colors hover:bg-card/50', className)} {...props}>
			{/* Background Grid Pattern (z-0, theme-safe without black artifacts in light mode) */}
			<div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(to_bottom,white_30%,transparent_90%)] z-0">
				<div className="absolute inset-0 bg-gradient-to-r from-neutral-500/[0.03] to-transparent dark:from-primary/[0.05] [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
					<GridPattern
						width={20}
						height={20}
						x="-12"
						y="4"
						squares={p}
						className="text-neutral-900/[0.07] dark:text-white/[0.08] absolute inset-0 h-full w-full"
					/>
				</div>
			</div>

			{/* Foreground Content (z-10 to stay strictly above background squares) */}
			<div className="relative z-10 flex flex-col justify-between h-full">
				<div>
					<div className="flex items-center justify-between mb-8">
						<div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
							<feature.icon className="size-5" strokeWidth={1.5} aria-hidden />
						</div>
						{feature.badge && (
							<span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-border bg-card/80 text-foreground/80 tracking-wide">
								{feature.badge}
							</span>
						)}
					</div>
					<h3 className="text-sm md:text-base font-semibold text-foreground tracking-tight">{feature.title}</h3>
					<p className="text-muted-foreground mt-2 text-xs font-normal leading-relaxed">{feature.description}</p>
				</div>
			</div>
		</div>
	);
}

function GridPattern({
	width,
	height,
	x,
	y,
	squares,
	className,
	...props
}: React.ComponentProps<'svg'> & { width: number; height: number; x: string; y: string; squares?: number[][] }) {
	const patternId = React.useId();

	return (
		<svg aria-hidden="true" className={className} {...props}>
			<defs>
				<pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
					<path d={`M.5 ${height}V.5H${width}`} fill="none" stroke="currentColor" strokeWidth={1} />
				</pattern>
			</defs>
			<rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
			{squares && (
				<svg x={x} y={y} className="overflow-visible">
					{squares.map(([x, y], index) => (
						<rect
							strokeWidth="1"
							key={index}
							width={width}
							height={height}
							x={x * width}
							y={y * height}
							className="fill-neutral-900/[0.04] stroke-neutral-900/[0.12] dark:fill-primary/[0.10] dark:stroke-primary/[0.30] transition-colors"
						/>
					))}
				</svg>
			)}
		</svg>
	);
}

export function genRandomPattern(seedStr?: string, length: number = 6): number[][] {
	let seed = 42;
	if (seedStr) {
		for (let i = 0; i < seedStr.length; i++) {
			seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
		}
	} else {
		seed = Math.floor(Math.random() * 10000);
	}
	const random = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return (seed & 0xffff) / 0x10000;
	};

	return Array.from({ length }, () => [
		Math.floor(random() * 4) + 7, // x between 7 and 10
		Math.floor(random() * 6) + 1, // y between 1 and 6
	]);
}
