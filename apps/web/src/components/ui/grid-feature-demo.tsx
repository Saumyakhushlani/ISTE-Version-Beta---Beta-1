'use client';

import React from 'react';
import { Lock, Cpu, TrendingUp, ShieldCheck, Layers, FileCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FeatureCard, type FeatureType } from '@/components/ui/grid-feature-cards';

export const FDL_PILLARS: FeatureType[] = [
	{
		title: '100% Local-First & Air-Gapped',
		icon: Lock,
		badge: 'CORE USP',
		description:
			'Statements, balances, and account numbers reside strictly on your machine in local SQLite. Zero cloud transmission, zero telemetry, absolute data security.',
	},
	{
		title: 'Deterministic Integer Paise Math',
		icon: Cpu,
		badge: '0 FLOAT DRIFT',
		description:
			'All financial calculations execute in exact integer paise (1 INR = 100 Paise). LLMs are strictly forbidden from calculating headroom or balances.',
	},
	{
		title: '5,000 Monte Carlo Simulations',
		icon: TrendingUp,
		badge: 'SEED=42',
		description:
			'Simulates 5,000 daily spend trajectories under random shocks to establish reproducible P10 (conservative), P50 (median), and P90 headroom distributions.',
	},
	{
		title: 'Dynamic Volatility Buffer',
		icon: ShieldCheck,
		badge: 'ADAPTIVE',
		description:
			'Measures income volatility via Coefficient of Variation. Freelancers with irregular credits automatically receive an elevated safety reserve multiplier.',
	},
	{
		title: '8-Step Reasoning Ledger',
		icon: Layers,
		badge: 'AUDITABLE',
		description:
			'Every verdict produces a cryptographically auditable trail of discrete steps linking opening balance, inflows, recurring obligations, and final headroom.',
	},
	{
		title: 'Number-Verification Guard',
		icon: FileCheck,
		badge: 'ANTI-HALLUCINATION',
		description:
			'Before displaying plain-English advice, a strict regex guard validates every numerical figure cited against the ledger. Any mismatch defaults to template math.',
	},
];

export default function GridFeatureDemo() {
	return (
		<section className="py-16 md:py-24">
			<div className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
				<AnimatedContainer className="mx-auto max-w-3xl text-center">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 text-xs font-mono text-primary mb-4">
						<span className="w-1.5 h-1.5 rounded-full bg-primary" />
						PROVEN FINANCIAL ARCHITECTURE
					</div>
					<h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl lg:text-5xl text-foreground">
						Power. Security. Certainty.
					</h2>
					<p className="text-muted-foreground mt-4 text-sm tracking-wide text-balance md:text-base leading-relaxed">
						Personal finance intelligence built on zero error tolerance. Run entirely on your device with provable mathematical verification.
					</p>
				</AnimatedContainer>

				<AnimatedContainer
					delay={0.2}
					className="grid grid-cols-1 divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card/20 sm:grid-cols-2 md:grid-cols-3 sm:divide-y-0 sm:divide-x divide-dashed border-dashed"
				>
					{FDL_PILLARS.map((feature, i) => (
						<FeatureCard key={i} feature={feature} />
					))}
				</AnimatedContainer>
			</div>
		</section>
	);
}

type ViewAnimationProps = {
	delay?: number;
	className?: React.ComponentProps<typeof motion.div>['className'];
	children: React.ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: 10, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.6, ease: 'easeOut' }}
			className={className}
		>
			{children}
		</motion.div>
	);
}
