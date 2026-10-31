'use client';
import React from 'react';
import { Zap, Cpu, Fingerprint, Pencil, Settings2, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FeatureCard, type FeatureType } from '@/components/ui/grid-feature-cards';

const features: FeatureType[] = [
	{
		title: 'Faaast',
		icon: Zap,
		description: 'It supports an entire ecosystem helping developers and innovate.',
	},
	{
		title: 'Powerful',
		icon: Cpu,
		description: 'It supports an entire platform helping developers and businesses.',
	},
	{
		title: 'Security',
		icon: Fingerprint,
		description: 'It supports enterprise security helping developers and businesses.',
	},
	{
		title: 'Customization',
		icon: Pencil,
		description: 'It supports fine-grained controls helping developers innovate.',
	},
	{
		title: 'Control',
		icon: Settings2,
		description: 'It supports deterministic logic helping businesses maintain control.',
	},
	{
		title: 'Built for AI',
		icon: Sparkles,
		description: 'It supports verified agents helping developers build with confidence.',
	},
];

export default function DemoOne() {
	return (
		<section className="py-16 md:py-32">
			<div className="mx-auto w-full max-w-5xl space-y-8 px-4">
				<AnimatedContainer className="mx-auto max-w-3xl text-center">
					<h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl xl:font-extrabold">
						Power. Speed. Control.
					</h2>
					<p className="text-muted-foreground mt-4 text-sm tracking-wide text-balance md:text-base">
						Everything you need to build fast, secure, scalable apps.
					</p>
				</AnimatedContainer>

				<AnimatedContainer
					delay={0.4}
					className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 border border-dashed border-border divide-y sm:divide-y-0 divide-dashed divide-border rounded-2xl overflow-hidden bg-card/20 shadow-xs"
				>
					{features.map((feature, i) => (
						<FeatureCard
							key={i}
							feature={feature}
							className="md:[&:not(:nth-child(3n))]:border-r md:[&:not(:nth-child(3n))]:border-dashed md:[&:not(:nth-child(3n))]:border-border md:[&:nth-child(-n+3)]:border-b md:[&:nth-child(-n+3)]:border-dashed md:[&:nth-child(-n+3)]:border-border sm:max-md:[&:not(:nth-child(2n))]:border-r sm:max-md:[&:not(:nth-child(2n))]:border-dashed sm:max-md:[&:not(:nth-child(2n))]:border-border sm:max-md:[&:nth-child(-n+4)]:border-b sm:max-md:[&:nth-child(-n+4)]:border-dashed sm:max-md:[&:nth-child(-n+4)]:border-border max-sm:[&:not(:last-child)]:border-b max-sm:[&:not(:last-child)]:border-dashed max-sm:[&:not(:last-child)]:border-border"
						/>
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

export function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
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
