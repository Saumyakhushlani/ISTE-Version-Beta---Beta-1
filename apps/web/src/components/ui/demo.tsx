'use client';

import React from 'react';
import { Lock, Cpu, TrendingUp, ShieldCheck, Layers, FileCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FeatureCard, type FeatureType } from '@/components/ui/grid-feature-cards';

const features: FeatureType[] = [
	{
		title: '100% Local-First & Air-Gapped',
		icon: Lock,
		badge: 'CORE USP',
		description:
			'Runs completely offline on your local machine. Bank transactions, statements, and balances remain in your local SQLite database — zero cloud leaks, absolute privacy.',
	},
	{
		title: 'Deterministic Integer Math',
		icon: Cpu,
		badge: 'PAISE-PRECISION',
		description:
			'All financial calculations execute in exact integer paise (1 INR = 100 paise). The LLM is strictly prohibited from doing math or hallucinating figures.',
	},
	{
		title: '5,000 Monte Carlo Runs',
		icon: TrendingUp,
		badge: 'SEED=42',
		description:
			'Evaluates daily volatility across 5,000 simulated expense paths to compute rigorous P10, P50, and P90 headroom probability percentiles.',
	},
	{
		title: 'Dynamic Volatility Buffer',
		icon: ShieldCheck,
		badge: 'ADAPTIVE',
		description:
			'Measures income coefficient of variation to automatically scale emergency reserves for freelancers and variable earners up to 2.0x essentials.',
	},
	{
		title: '8-Step Reasoning Ledger',
		icon: Layers,
		badge: 'AUDITABLE',
		description:
			'Every verdict produces a verifiable, multi-step financial audit trail from opening balance to recurring commitments and available headroom.',
	},
	{
		title: 'Number-Verification Guard',
		icon: FileCheck,
		badge: 'ANTI-HALLUCINATION',
		description:
			'An automated regex guard verifies every number cited in natural language explanations against the ledger before displaying it to the user.',
	},
];

export default function DemoOne() {
	return (
		<section className="py-16 md:py-32">
			<div className="mx-auto w-full max-w-5xl space-y-8 px-4">
				<AnimatedContainer className="mx-auto max-w-3xl text-center">
					<h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl xl:font-extrabold text-foreground">
						Power. Speed. Control.
					</h2>
					<p className="text-muted-foreground mt-4 text-sm tracking-wide text-balance md:text-base">
						Everything you need to make unshakeable financial decisions with 100% local data security.
					</p>
				</AnimatedContainer>

				<AnimatedContainer
					delay={0.4}
					className="grid grid-cols-1 divide-x divide-y divide-dashed border border-dashed border-border rounded-xl overflow-hidden sm:grid-cols-2 md:grid-cols-3"
				>
					{features.map((feature, i) => (
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
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			className={className}
		>
			{children}
		</motion.div>
	);
}
