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
		<div className={cn('relative overflow-hidden p-6 bg-card/30 transition-colors hover:bg-card/60', className)} {...props}>
			<div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
				<div className="from-foreground/5 to-foreground/1 absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] opacity-100">
					<GridPattern
						width={20}
						height={20}
						x="-12"
						y="4"
						squares={p}
						className="fill-foreground/5 stroke-foreground/20 absolute inset-0 h-full w-full mix-blend-overlay"
					/>
				</div>
			</div>
			<div className="flex items-center justify-between relative z-10">
				<div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
					<feature.icon className="size-5" strokeWidth={1.5} aria-hidden />
				</div>
				{feature.badge && (
					<span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-border bg-muted/70 text-foreground/80">
						{feature.badge}
					</span>
				)}
			</div>
			<h3 className="mt-8 text-sm md:text-base font-semibold text-foreground tracking-tight">{feature.title}</h3>
			<p className="text-muted-foreground relative z-20 mt-2 text-xs leading-relaxed font-normal">{feature.description}</p>
		</div>
	);
}

function GridPattern({
	width,
	height,
	x,
	y,
	squares,
	...props
}: React.ComponentProps<'svg'> & { width: number; height: number; x: string; y: string; squares?: number[][] }) {
	const patternId = React.useId();

	return (
		<svg aria-hidden="true" {...props}>
			<defs>
				<pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
					<path d={`M.5 ${height}V.5H${width}`} fill="none" />
				</pattern>
			</defs>
			<rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
			{squares && (
				<svg x={x} y={y} className="overflow-visible">
					{squares.map(([x, y], index) => (
						<rect strokeWidth="0" key={index} width={width + 1} height={height + 1} x={x * width} y={y * height} />
					))}
				</svg>
			)}
		</svg>
	);
}

function genRandomPattern(seedStr?: string, length: number = 6): number[][] {
	let seed = 42;
	if (seedStr) {
		for (let i = 0; i < seedStr.length; i++) {
			seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
		}
	}
	const random = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return (seed & 0xffff) / 0x10000;
	};

	return Array.from({ length }, () => [
		Math.floor(random() * 5) + 6, // x between 6 and 10
		Math.floor(random() * 6) + 1, // y between 1 and 6
	]);
}
