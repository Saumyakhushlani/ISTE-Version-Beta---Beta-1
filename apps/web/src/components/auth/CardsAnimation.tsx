'use client';

import React, { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface CardsAnimationProps {
  className?: string;
  size?: number | string;
}

const LOTTIE_CDN_URL = 'https://lottie.host/c6fe6292-dcce-48c7-a553-95d3a9714309/bZv2JiqnSY.lottie';
const LOTTIE_EMBED_URL = 'https://lottie.host/embed/c6fe6292-dcce-48c7-a553-95d3a9714309/bZv2JiqnSY.lottie';

export function CardsAnimation({ className = '', size }: CardsAnimationProps) {
  const [mounted, setMounted] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDotLottieRef = (instance: any) => {
    if (instance) {
      instance.addEventListener('loadError', () => {
        console.warn('DotLottie failed to load from CDN, switching to embed fallback');
        setUseIframeFallback(true);
      });
    }
  };

  return (
    <div className={`relative w-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* Dynamic ambient dual-color radial glow backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-3xl opacity-30 dark:opacity-40 pointer-events-none transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(47, 197, 160, 0.35) 0%, rgba(33, 98, 203, 0.25) 50%, transparent 75%)',
        }}
      />

      {/* Lottie Animation Container - Full width without boundary box */}
      <div
        className="relative z-10 w-full aspect-square flex items-center justify-center transition-transform duration-500 hover:scale-[1.02]"
        style={size ? { width: size, height: size } : undefined}
      >
        {!mounted ? (
          <div className="w-full flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl border border-primary/20 bg-primary/5 animate-pulse" />
          </div>
        ) : useIframeFallback ? (
          <iframe
            src={LOTTIE_EMBED_URL}
            className="w-full h-full border-0 pointer-events-none bg-transparent"
            title="Payment Cards Animation"
          />
        ) : (
          <DotLottieReact
            src={LOTTIE_CDN_URL}
            loop
            autoplay
            dotLottieRefCallback={handleDotLottieRef}
            style={{ width: '95%', height: '95%' }}
          />
        )}
      </div>
    </div>
  );
}

export default CardsAnimation;
