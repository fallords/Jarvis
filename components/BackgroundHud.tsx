"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "motion/react";

/**
 * A full-screen HUD-style animated background.
 * - Slightly darkened and blurred
 * - Animated rotating rings and subtle floating particles
 * - pointer-events-none so it never blocks UI interaction
 */
export default function BackgroundHud() {
  // low-power detection: automatically reduce detail when on slow devices or Save-Data
  const [lowPower, setLowPower] = useState(false);
  useEffect(() => {
    try {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection || {};
      const save = !!conn.saveData;
      const eff = conn.effectiveType || '';
      const mem = (navigator as any).deviceMemory || 4;
      if (save || eff.includes('2g') || mem <= 2) setLowPower(true);
    } catch (e) {
      // ignore
    }
  }, []);

  // memoized particles so they aren't recreated on every render; count depends on lowPower
  const particles = useMemo(() => {
    const count = lowPower ? 6 : 12;
    return new Array(count).fill(0).map((_, i) => ({
      id: i,
      left: `${10 + (i * 7) % 80}%`,
      top: `${5 + (i * 13) % 80}%`,
      delay: (i % 5) * 0.6,
      size: 2 + (i % 4) * 2,
    }));
  }, [lowPower]);

  // extra decorative particle set (larger, slower) memoized
  const bigParticles = useMemo(() => {
    const count = lowPower ? 3 : 6;
    return new Array(count).fill(0).map((_, i) => ({
      id: i,
      left: `${8 + (i * 17) % 84}%`,
      top: `${12 + (i * 23) % 76}%`,
      delay: (i % 4) * 0.9,
      size: 6 + (i % 3) * 4,
    }));
  }, [lowPower]);

  // purely visual animation drivers (design-only)
  const [aLevel, setALevel] = useState(0.12); // 0..1 synthetic activity level
  // reduce spectral bands depending on power mode (smaller for performance)
  const SPECTRAL_BANDS = lowPower ? 6 : 12;
  const [spectral, setSpectral] = useState<number[]>(new Array(SPECTRAL_BANDS).fill(0.05));
  const mouseRef = useRef({ x: 0.5, y: 0.5 }); // normalized
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [glitch, setGlitch] = useState(false);

  // Helper to round coordinates to 3 decimal places to avoid tiny server/client float mismatches
  const round = (n: number) => Math.round(n * 1000) / 1000;

  // keep aLevel in a ref so canvas loop doesn't need to re-run effect on every aLevel change
  const aLevelRef = useRef(aLevel);
  useEffect(() => { aLevelRef.current = aLevel; }, [aLevel]);

  // Canvas refs and particle state for efficient rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const devicePixelRatioRef = useRef<number>(1);

  // Initialize canvas and drawing loop
  useEffect(() => {
    const canvas = document.getElementById('hud-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    devicePixelRatioRef.current = dpr;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.scale(dpr, dpr);

    // create internal particle objects from the memoized arrays
    const partObjs = particles.map((p) => ({
      x: (parseFloat(p.left) / 100) * width || 0,
      y: (parseFloat(p.top) / 100) * height || 0,
      size: p.size,
      delay: p.delay,
      id: p.id,
      vy: Math.random() * -0.2 - 0.1,
      ox: parseFloat(p.left) / 100,
      oy: parseFloat(p.top) / 100,
    }));

    const orbitCount = lowPower ? 4 : 6;

    let rafId: number | null = null;
    let last = performance.now();

  const draw = (now: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

  // clear
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const baseR = Math.min(width, height) * 0.12;

        // read current activity level from ref
      const localALevel = aLevelRef.current;
      // update and draw floating particles
      for (let i = 0; i < partObjs.length; i++) {
        const p = partObjs[i];
        p.y += (p.vy * (1 + localALevel * 2)) * (lowPower ? 0.6 : 1.0);
        // wrap
        if (p.y < -10) p.y = height + 10;
        ctx.fillStyle = 'rgba(6,182,212,0.85)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // draw orbiting nodes and connecting lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(96,165,250,${0.06 + aLevel * 0.18})`;
      for (let i = 0; i < orbitCount; i++) {
        const angle = (i / orbitCount) * Math.PI * 2 + now / 2000;
        const r = Math.min(width, height) * (lowPower ? 0.25 : 0.34);
        const lx = cx + Math.cos(angle) * r;
        const ly = cy + Math.sin(angle) * r;
  ctx.beginPath(); ctx.arc(lx, ly, lowPower ? 2 : 4 + (i % 3) * 1.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(103,232,249,0.9)'; ctx.fill();
        // line to next
        const ni = (i + 1) % orbitCount;
        const nAngle = (ni / orbitCount) * Math.PI * 2 + now / 2000;
        const nx = cx + Math.cos(nAngle) * r;
        const ny = cy + Math.sin(nAngle) * r;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(nx, ny); ctx.stroke();
      }

      // draw center burst (simple radial dots)
      const burstCount = lowPower ? 6 : 10;
      for (let i = 0; i < burstCount; i++) {
        const a = (i / burstCount) * Math.PI * 2 + now / 600;
  const rr = baseR * (0.2 + 0.6 * Math.abs(Math.sin(now / 400 + i)));
  const bx = cx + Math.cos(a) * rr * (0.6 + localALevel * 0.8);
  const by = cy + Math.sin(a) * rr * (0.6 + localALevel * 0.8);
        ctx.beginPath(); ctx.arc(bx, by, lowPower ? 1.5 : 2 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(188,250,255,0.9)'; ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    const onResize = () => {
      width = canvas.clientWidth; height = canvas.clientHeight;
      const dpr2 = window.devicePixelRatio || 1; devicePixelRatioRef.current = dpr2;
      canvas.width = Math.max(1, Math.floor(width * dpr2));
      canvas.height = Math.max(1, Math.floor(height * dpr2));
      ctx.setTransform(dpr2, 0, 0, dpr2, 0, 0);
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      // clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [particles, lowPower, aLevel]);

  // synthetic animation loop to simulate liveliness without system/mic access
  useEffect(() => {
    // throttle RAF updates: compute every frame but only update React state every `throttleFrames`.
    let raf: number | null = null;
    let t = 0;
    let last = performance.now();
  const baseThrottleFrames = lowPower ? 6 : 3; // fewer updates in low-power mode
    let frameCounter = 0;

    const loop = (now: number) => {
      // pause heavy work when tab is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const dt = (now - last);
      if (dt >= 33) { // roughly 30fps input
        last = now;
        t += dt / 1000;
        frameCounter++;

        // synthetic level mixes a slow breath + faster pulses + occasional spikes
        const breath = 0.12 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.6));
        const pulse = 0.06 * Math.abs(Math.sin(t * 3.2));
        const spike = Math.random() > 0.98 ? 0.4 + Math.random() * 0.6 : 0;
        const lvl = Math.min(1, breath + pulse + spike);

        // compute spectral for visuals (fewer bands in low-power)
        const bands = SPECTRAL_BANDS;
        const out: number[] = new Array(bands).fill(0);
        for (let i = 0; i < bands; i++) {
          const phase = (i / bands) * Math.PI * 2;
          out[i] = Math.max(0.02, 0.22 * Math.abs(Math.sin(t * (0.6 + (i % 5) * 0.08) + phase)));
        }
        for (let i = 0; i < bands; i++) out[i] = Math.min(1, out[i] + (Math.random() * 0.02) + lvl * 0.04);

        // Adapt throttle when activity (lvl) is high to avoid spiking updates while the agent talks
        const effectiveThrottle = lvl > 0.6 ? Math.max(baseThrottleFrames, 6) : baseThrottleFrames;
        if ((frameCounter % effectiveThrottle) === 0) {
          setALevel((prev) => {
            const next = Math.max(lvl, prev * 0.92);
            return Math.abs(next - prev) < 0.001 ? prev : next;
          });

          setSpectral((prev) => {
            let changed = false;
            for (let i = 0; i < bands; i++) {
              if (Math.abs((prev[i] ?? 0) - out[i]) > 0.003) { changed = true; break; }
            }
            return changed ? out : prev;
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [lowPower, SPECTRAL_BANDS]);

  // mouse parallax (throttled with rAF)
  useEffect(() => {
    let rafId: number | null = null;
    const onMove = (ev: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const x = Math.max(0, Math.min(1, ev.clientX / w));
      const y = Math.max(0, Math.min(1, ev.clientY / h));
      mouseRef.current = { x, y };
      if (rafId == null) {
        rafId = requestAnimationFrame(() => {
          setMousePos(mouseRef.current);
          rafId = null;
        });
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  // occasional glitch flicker
  useEffect(() => {
    const iv = setInterval(() => {
      if (Math.random() > 0.9) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 80 + Math.random() * 240);
      }
    }, 700);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* blurred, darkened background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(4,43,58,0.55) 0%, rgba(0,0,0,0.85) 60%)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* faint grid / HUD noise */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(10,60,90,0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(10,60,90,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          mixBlendMode: 'screen',
          opacity: 0.6,
        }}
      />

  {/* rotating central HUD rings (multiple layers, different speeds) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: lowPower ? 240 : 120, ease: 'linear' }}
        style={{ transform: `translate3d(${(mousePos.x - 0.5) * (lowPower ? 6 : 18)}px, ${(mousePos.y - 0.5) * (lowPower ? 4 : 12)}px, 0)` }}
      >
        <svg width="640" height="640" viewBox="0 0 640 640" fill="none" className="opacity-80" style={{ filter: lowPower ? 'blur(2px)' : undefined }}>
          <circle cx="320" cy="320" r="120" stroke="#38bdf8" strokeWidth={lowPower ? 1 : 2} strokeOpacity="0.9" />
          {!lowPower && <circle cx="320" cy="320" r="170" stroke="#06b6d4" strokeWidth="3" strokeOpacity="0.55" />}
          {!lowPower && <circle cx="320" cy="320" r="240" stroke="#0891b2" strokeWidth="1.5" strokeOpacity="0.32" />}
          {/* removed outer radial fill per request */}

          {/* small ticks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const x1 = round(320 + Math.cos(a) * 300);
            const y1 = round(320 + Math.sin(a) * 300);
            const x2 = round(320 + Math.cos(a) * 285);
            const y2 = round(320 + Math.sin(a) * 285);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#22d3ee"
                strokeOpacity={0.12}
                strokeWidth={1}
              />
            );
          })}
        </svg>
      </motion.div>

      {/* faster inner ring rotating opposite direction */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 20 - Math.min(8, aLevel * 6), ease: 'linear' }}
        style={{ transform: `translate3d(${(mousePos.x - 0.5) * -10}px, ${(mousePos.y - 0.5) * -6}px, 0)` }}
      >
        <svg width="420" height="420" viewBox="0 0 420 420" fill="none" className="opacity-70">
          <circle cx="210" cy="210" r="60" stroke="#7dd3fc" strokeWidth="2" strokeOpacity="0.85" />
          <circle cx="210" cy="210" r="96" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x1 = round(210 + Math.cos(a) * 106);
            const y1 = round(210 + Math.sin(a) * 106);
            const x2 = round(210 + Math.cos(a) * 96);
            const y2 = round(210 + Math.sin(a) * 96);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7dd3fc" strokeOpacity={0.18} strokeWidth={1} />;
          })}
        </svg>
      </motion.div>

      {/* flowing arcs around center (gives more motion) */}
      <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 640 640" style={{ overflow: 'visible', pointerEvents: 'none' }}>
        {[
          { r: 140, stroke: '#60a5fa', w: 1.6, dur: 8 },
          { r: 200, stroke: '#22d3ee', w: 1.2, dur: 12 },
          { r: 260, stroke: '#7dd3fc', w: 1, dur: 18 },
        ].map((a, idx) => {
          const path = `M320 ${320 - a.r} A ${a.r} ${a.r} 0 1 1 ${319.9} ${320 - a.r}`;
          return (
            <motion.path
              key={idx}
              d={path}
              fill="none"
              stroke={a.stroke}
              strokeWidth={a.w}
              strokeOpacity={0.08 + aLevel * 0.12}
              style={{ strokeDasharray: 300, strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: [0, -300, 0], opacity: [0.05 + aLevel * 0.05, 0.22 + aLevel * 0.4, 0.05 + aLevel * 0.05] }}
              transition={{ repeat: Infinity, duration: a.dur - Math.min(4, aLevel * 3), ease: 'linear' }}
            />
          );
        })}
      </svg>

      {/* pulsing ring */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.02 + aLevel * 0.6, 1], opacity: [0.5 + aLevel * 0.2, 0.95, 0.5 + aLevel * 0.2] }}
        transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut' }}
        style={{ transform: `translate3d(${(mousePos.x - 0.5) * 6}px, ${(mousePos.y - 0.5) * 4}px, 0)` }}
      >
        <svg width="520" height="520" viewBox="0 0 520 520" fill="none" className="opacity-60">
          <circle cx="260" cy="260" r="200" stroke="#34d399" strokeWidth="2" strokeOpacity={0.06 + aLevel * 0.12} />
        </svg>
      </motion.div>

      {/* --- lively center: core glow, rotating segments, ripples --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* center glow + core */}
        <motion.div
          style={{
            width: 220,
            height: 220,
            borderRadius: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mixBlendMode: 'screen'
          }}
          animate={{ scale: [1, 1 + aLevel * 0.08, 1], rotate: [0, aLevel * 6, 0] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
        >
          <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: 9999, background: 'radial-gradient(circle at 40% 40%, rgba(56,189,248,0.09), rgba(14,165,233,0.02) 35%, transparent 60%)', filter: 'blur(28px)', opacity: 0.9 }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: 9999, background: 'radial-gradient(circle at 50% 50%, rgba(125,211,252,0.26), rgba(56,189,248,0.06) 45%, transparent 70%)', boxShadow: `0 0 ${18 + aLevel * 60}px rgba(56,189,248,${0.12 + aLevel * 0.6})` }} />

          {/* center core circle */}
          <motion.div
            style={{ width: 88, height: 88, borderRadius: 9999, background: 'radial-gradient(circle, #e6fffb 0%, #7dd3fc 45%, #0369a1 100%)', boxShadow: `0 0 ${12 + aLevel * 48}px rgba(14,165,233,${0.5 + aLevel * 0.5})`, border: '1px solid rgba(255,255,255,0.08)' }}
            animate={{ scale: [1, 1 + aLevel * 0.28, 1], rotate: [0, 18 * aLevel, 0], opacity: [0.95, 1, 0.95] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          />

          {/* rotating micro-segments */}
          <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute' }}>
            <g transform="translate(110,110)">
                {Array.from({ length: lowPower ? 6 : 8 }).map((_, i) => {
                  const ang = (i / (lowPower ? 6 : 8)) * Math.PI * 2;
                  const rx = 72 + (i % 3) * 6;
                  const x = round(Math.cos(ang) * rx);
                  const y = round(Math.sin(ang) * rx);
                  return (
                    <rect
                      key={i}
                      x={round(x - 4)}
                      y={round(y - 6)}
                      width={lowPower ? 6 : 8}
                      height={lowPower ? 8 : 12}
                      rx={2}
                      fill="#7dd3fc"
                      opacity={0.7 - (i % 3) * 0.08}
                    />
                  );
                })}
              </g>
          </svg>

          {/* subtle ripple waves */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={`r-${i}`}
              style={{ position: 'absolute', width: 60 + i * 60, height: 60 + i * 60, borderRadius: 9999, border: `1.2px solid rgba(125,211,252,${0.06 + i * 0.03 + aLevel * 0.08})` }}
              animate={{ scale: [0.6 + i * 0.12, 1 + aLevel * 0.18 + i * 0.06], opacity: [0.25, 0.08, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.6 + i * 0.8, ease: 'easeOut', delay: i * 0.12 }}
            />
          ))}

          {/* small orbiting nodes near the core */}
          {/* collapsed orbiting dots & connecting lines into one SVG for fewer nodes */}
          <svg width={640} height={640} className="absolute" style={{ left: 0, top: 0, pointerEvents: 'none' }}>
            {Array.from({ length: lowPower ? 4 : 6 }).map((_, i) => {
              const angle = (i / (lowPower ? 4 : 6)) * Math.PI * 2;
              const left = round(320 + Math.cos(angle) * (lowPower ? 160 : 220));
              const top = round(320 + Math.sin(angle) * (lowPower ? 160 : 220));
              const size = lowPower ? 3 : 4 + (i % 3) * 2;
              return (
                <g key={`orbit-${i}`}>
                  <circle cx={left} cy={top} r={size} fill="#67e8f9" opacity={0.9} />
                  <line x1={left} y1={top} x2={round(320 + Math.cos(((i + 1) / (lowPower ? 4 : 6)) * Math.PI * 2) * (lowPower ? 160 : 220))} y2={round(320 + Math.sin(((i + 1) / (lowPower ? 4 : 6)) * Math.PI * 2) * (lowPower ? 160 : 220))} stroke="#60a5fa" strokeOpacity={0.06 + aLevel * 0.18} strokeWidth={1} strokeDasharray={8} />
                </g>
              );
            })}
          </svg>

        </motion.div>
      </div>

      {/* scanning beam */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ rotate: -40 }}
        animate={{ rotate: [-40, 40, -40] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        style={{ mixBlendMode: 'screen', opacity: 0.25 + aLevel * 0.6, transform: `translate3d(${(mousePos.x - 0.5) * 10}px, ${(mousePos.y - 0.5) * 6}px, 0)` }}
      >
        <div
          style={{
            width: 820,
            height: 140,
            borderRadius: 9999,
            background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(56,189,248,0.22) 50%, rgba(0,0,0,0) 100%)',
            filter: 'blur(18px)',
            transform: `scale(${1 + aLevel * 0.06})`
          }}
        />
      </motion.div>

      {/* orbiting indicator dots */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 30 - Math.min(12, aLevel * 12), ease: 'linear' }}
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const left = round(320 + Math.cos(angle) * 220); // center-based coords in px
          const top = round(320 + Math.sin(angle) * 220);
          const size = 4 + (i % 3) * 2;
            return (
            <React.Fragment key={i}>
            <motion.div
              className="absolute rounded-full bg-cyan-200"
              style={{ width: size, height: size, left: `${left}px`, top: `${top}px`, boxShadow: `0 0 ${8 + aLevel * 20}px rgba(34,211,238,${0.5 + aLevel * 0.5})` }}
              animate={{ scale: [1, 1 + 0.8 * (0.6 + aLevel), 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.6 + (i % 4) * 0.4 - aLevel, delay: i * 0.05 }}
            />
            {/* connecting line to next dot */}
            <svg className="absolute" style={{ left: 0, top: 0 }} width={640} height={640} key={`line-${i}`}>
              <line
                x1={left}
                y1={top}
                x2={round(320 + Math.cos(((i + 1) / 6) * Math.PI * 2) * 220)}
                y2={round(320 + Math.sin(((i + 1) / 6) * Math.PI * 2) * 220)}
                stroke="#60a5fa"
                strokeOpacity={0.06 + aLevel * 0.18}
                strokeWidth={1}
                style={{ strokeDasharray: 8, strokeDashoffset: glitch ? 6 : 0, transition: 'stroke-dashoffset 180ms linear' }}
              />
            </svg>
            </React.Fragment>
          );
        })}
      </motion.div>

      {/* HUD data panels (top-left, top-right) */}
      <motion.div
        className="absolute left-6 top-6 rounded-md bg-[rgba(5,30,45,0.28)] p-3"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: [-6, 0, -6], opacity: [0.75 + aLevel * 0.15, 1, 0.75 + aLevel * 0.15] }}
        transition={{ repeat: Infinity, duration: 5.4, ease: 'easeInOut' }}
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(14,165,233,0.08)' }}
      >
        <div className="w-40 h-2 mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ transform: `scaleX(${0.9 + aLevel * 0.4})` }} />
        <div className="flex gap-2">
          <div className="w-24 h-3 bg-[rgba(255,255,255,0.06)] rounded" style={{ opacity: 0.6 + aLevel * 0.35 }} />
          <div className="w-8 h-3 bg-[rgba(255,255,255,0.03)] rounded" style={{ opacity: 0.45 + aLevel * 0.25 }} />
        </div>
      </motion.div>

      <motion.div
        className="absolute right-6 top-10 rounded-md bg-[rgba(5,30,45,0.22)] p-3"
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: [6, 0, 6], opacity: [0.7 + aLevel * 0.2, 1, 0.7 + aLevel * 0.2] }}
        transition={{ repeat: Infinity, duration: 6.8, ease: 'easeInOut', delay: 0.6 }}
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(14,165,233,0.06)' }}
      >
        <div className="w-36 h-2 mb-2 bg-gradient-to-r from-sky-400 to-cyan-500 rounded-full" style={{ transform: `scaleX(${0.92 + aLevel * 0.38})` }} />
        <div className="flex gap-2">
          <div className="w-20 h-3 bg-[rgba(255,255,255,0.05)] rounded" style={{ opacity: 0.6 + aLevel * 0.3 }} />
          <div className="w-10 h-3 bg-[rgba(255,255,255,0.03)] rounded" style={{ opacity: 0.45 + aLevel * 0.25 }} />
        </div>
      </motion.div>

      {/* bottom waveform */}
      <div className="absolute left-0 right-0 bottom-6 flex items-center justify-center pointer-events-none" style={{ transform: `translateY(${ -aLevel * 6 }px)` }}>
        <motion.svg width="640" height="80" viewBox="0 0 640 80" fill="none" className="opacity-90">
          <path
            d="M0 40 C80 40 120 10 180 28 C240 46 320 8 400 28 C480 46 560 10 640 40"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeOpacity={0.8 + aLevel * 0.15}
            fill="transparent"
          />
          <motion.path
            d="M0 40 C80 40 120 10 180 28 C240 46 320 8 400 28 C480 46 560 10 640 40"
            stroke="#7dd3fc"
            strokeWidth="1.6"
            strokeOpacity={0.6 + aLevel * 0.25}
            fill="transparent"
            animate={{ translateX: [0, -34 - aLevel * 28, 0] }}
            transition={{ repeat: Infinity, duration: 3.6 - Math.min(1.6, aLevel * 1.8), ease: 'linear' }}
          />

          {/* frequency bars above waveform */}
          {spectral.length > 0 && (
            <g transform="translate(0,8)">
              {spectral.map((v, i) => {
                const bw = 10; const gap = 2;
                const x = i * (bw + gap) + 12;
                const h = 6 + v * 40 + aLevel * 24;
                return (
                  <rect key={`f-${i}`} x={x} y={64 - h} width={bw} height={h} rx={2} fill={`rgba(125,211,252,${0.12 + v * 0.7})`} />
                );
              })}
            </g>
          )}
        </motion.svg>
      </div>

      {/* performant canvas for particles, orbiting nodes, and center bursts */}
      <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center pointer-events-none">
        <canvas id="hud-canvas" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* subtle pulsing overlay */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.04 }}
        animate={{ opacity: [0.04, 0.09, 0.04] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(circle at 30% 20%, rgba(10,120,160,0.06), transparent 20%), radial-gradient(circle at 70% 80%, rgba(0,80,120,0.05), transparent 30%)' }}
      />

      {/* NOTE: floating particles + orbiting nodes are drawn into the canvas above for performance */}
    </div>
  );
}
