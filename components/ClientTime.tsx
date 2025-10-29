"use client";

import React, { useMemo } from 'react';

interface ClientTimeProps {
  timestamp: string | number | Date;
  timeStyle?: 'short' | 'medium' | 'long' | 'full';
  className?: string;
}

export default function ClientTime({ timestamp, timeStyle = 'short', className }: ClientTimeProps) {
  const formatted = useMemo(() => {
    try {
      const d = typeof timestamp === 'string' || typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
      const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
      return d.toLocaleTimeString(locale, { timeStyle });
    } catch (e) {
      return '';
    }
  }, [timestamp, timeStyle]);

  return <span className={className}>{formatted}</span>;
}
