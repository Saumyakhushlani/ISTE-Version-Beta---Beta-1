'use client';

import React, { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface CardsAnimationProps {
  className?: string;
  size?: number | string;
  speed?: number;
}

const LOTTIE_CDN_URL = 'https://lottie.host/c6fe6292-dcce-48c7-a553-95d3a9714309/bZv2JiqnSY.lottie';
const LOCAL_ANIMATION_URL = '/animations/login-cards.json';
const LOTTIE_EMBED_URL = 'https://lottie.host/embed/c6fe6292-dcce-48c7-a553-95d3a9714309/bZv2JiqnSY.lottie';

export function CardsAnimation({ 
  className = '', 
  size, 
  speed = 0.55 
}: CardsAnimationProps) {
  const [mounted, setMounted] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDotLottieRef = (instance: any) => {
    if (instance) {
      try {
        instance.setSpeed(speed);
      } catch (e) {
        // Safe ignore
      }
      instance.addEventListener('loadError', () => {
        if (!useLocalFallback) {
          console.warn('DotLottie failed to load from CDN, trying local fallback');
          setUseLocalFallback(true);
        } else {
          console.warn('DotLottie local failed, switching to iframe embed fallback');
          setUseIframeFallback(true);
        }
      });
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Dynamic ambient dual-color radial glow backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-2xl opacity-25 dark:opacity-35 pointer-events-none transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(47, 197, 160, 0.3) 0%, rgba(33, 98, 203, 0.2) 50%, transparent 75%)',
        }}
      />

      {/* Lottie Animation Container - Professionally sized & constrained */}
      <div
        className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.02]"
        style={size ? { width: size, height: size } : undefined}
      >
        {!mounted ? (
          <div className="w-full h-full flex items-center justify-center min-h-[140px]">
            <div className="w-20 h-20 rounded-2xl border border-primary/20 bg-primary/5 animate-pulse" />
          </div>
        ) : useIframeFallback ? (
          <iframe
            src={LOTTIE_EMBED_URL}
            className="w-full h-full border-0 pointer-events-none bg-transparent"
            title="Payment Cards Animation"
          />
        ) : (
          <DotLottieReact
            src={useLocalFallback ? LOCAL_ANIMATION_URL : LOTTIE_CDN_URL}
            loop
            autoplay
            speed={speed}
            dotLottieRefCallback={handleDotLottieRef}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}
      </div>
    </div>
  );
}

export default CardsAnimation;
