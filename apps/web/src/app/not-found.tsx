'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-foreground">404 - Page Not Found</h2>
      <p className="mt-2 text-sm text-muted-foreground">The requested financial view or resource could not be found.</p>
      <Link
        href="/dashboard"
        className="mt-6 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
