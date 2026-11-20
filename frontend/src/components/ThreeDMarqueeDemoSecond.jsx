/**
 * ThreeDMarqueeDemoSecond — Advibe port of Aceternity UI 3d-marquee-demo-2
 *
 * Import and render this component anywhere in the app, e.g.:
 *   import ThreeDMarqueeDemoSecond from './components/ThreeDMarqueeDemoSecond';
 *
 * Port notes (differences from source):
 *  - `"use client"` kept as comment — harmless in Vite/React.
 *  - Import path rewritten: @/components/ui/3d-marquee → ./ui/ThreeDMarquee
 *  - Tailwind utility classes on the container/text/buttons converted to inline
 *    styles since this project uses vanilla CSS.
 *  - Named export `ThreeDMarqueeDemoSecond` added alongside the default export
 *    to match what the user pasted at the top of the request.
 */

import React from 'react';
import { ThreeDMarquee } from './ui/ThreeDMarquee';

const images = [
  'https://assets.aceternity.com/cloudinary_bkp/3d-card.png',
  'https://assets.aceternity.com/animated-modal.png',
  'https://assets.aceternity.com/animated-testimonials.webp',
  'https://assets.aceternity.com/cloudinary_bkp/Tooltip_luwy44.png',
  'https://assets.aceternity.com/github-globe.png',
  'https://assets.aceternity.com/glare-card.png',
  'https://assets.aceternity.com/layout-grid.png',
  'https://assets.aceternity.com/flip-text.png',
  'https://assets.aceternity.com/hero-highlight.png',
  'https://assets.aceternity.com/carousel.webp',
  'https://assets.aceternity.com/placeholders-and-vanish-input.png',
  'https://assets.aceternity.com/shooting-stars-and-stars-background.png',
  'https://assets.aceternity.com/signup-form.png',
  'https://assets.aceternity.com/cloudinary_bkp/stars_sxle3d.png',
  'https://assets.aceternity.com/spotlight-new.webp',
  'https://assets.aceternity.com/cloudinary_bkp/Spotlight_ar5jpr.png',
  'https://assets.aceternity.com/cloudinary_bkp/Parallax_Scroll_pzlatw_anfkh7.png',
  'https://assets.aceternity.com/tabs.png',
  'https://assets.aceternity.com/cloudinary_bkp/Tracing_Beam_npujte.png',
  'https://assets.aceternity.com/cloudinary_bkp/typewriter-effect.png',
  'https://assets.aceternity.com/glowing-effect.webp',
  'https://assets.aceternity.com/hover-border-gradient.png',
  'https://assets.aceternity.com/cloudinary_bkp/Infinite_Moving_Cards_evhzur.png',
  'https://assets.aceternity.com/cloudinary_bkp/Lamp_hlq3ln.png',
  'https://assets.aceternity.com/macbook-scroll.png',
  'https://assets.aceternity.com/cloudinary_bkp/Meteors_fye3ys.png',
  'https://assets.aceternity.com/cloudinary_bkp/Moving_Border_yn78lv.png',
  'https://assets.aceternity.com/multi-step-loader.png',
  'https://assets.aceternity.com/vortex.png',
  'https://assets.aceternity.com/wobble-card.png',
  'https://assets.aceternity.com/world-map.webp',
];

export function ThreeDMarqueeDemoSecond() {
  return (
    <div
      style={{
        position: 'relative',
        margin: '40px auto',
        display: 'flex',
        height: '100vh',
        width: '100%',
        maxWidth: '80rem',       // max-w-7xl
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '24px',    // rounded-3xl
      }}
    >
      {/* Heading */}
      <h2
        style={{
          position: 'relative',
          zIndex: 20,
          margin: '0 auto',
          maxWidth: '56rem',       // max-w-4xl
          textAlign: 'center',
          fontSize: 'clamp(1.5rem, 5vw, 3.75rem)',  // 2xl → 4xl → 6xl
          fontWeight: 700,
          color: '#ffffff',
          textWrap: 'balance',
          fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
        }}
      >
        This is your life and it&apos;s ending one{' '}
        <span
          style={{
            position: 'relative',
            zIndex: 20,
            display: 'inline-block',
            borderRadius: '12px',
            background: 'rgba(59,130,246,0.4)',   // bg-blue-500/40
            padding: '2px 16px',
            color: '#ffffff',
            textDecoration: 'underline',
            textDecorationColor: '#38bdf8',       // decoration-sky-500
            textDecorationThickness: '6px',
            textUnderlineOffset: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          moment
        </span>{' '}
        at a time.
      </h2>

      {/* Subtitle */}
      <p
        style={{
          position: 'relative',
          zIndex: 20,
          margin: '0 auto',
          maxWidth: '42rem',      // max-w-2xl
          padding: '32px 0',      // py-8
          textAlign: 'center',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          color: '#e5e5e5',       // neutral-200
        }}
      >
        You are not your job, you&apos;re not how much money you have in the
        bank. You are not the car you drive. You&apos;re not the contents of
        your wallet.
      </p>

      {/* Buttons */}
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          paddingTop: '16px',     // pt-4
        }}
      >
        <button
          style={{
            borderRadius: '6px',
            background: '#0284c7',  // sky-600
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#0369a1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#0284c7'; }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #38bdf8';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
        >
          Join the club
        </button>
        <button
          style={{
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#ffffff',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'background 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid rgba(255,255,255,0.2)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
        >
          Read more
        </button>
      </div>

      {/* Dark overlay — sits above the marquee, below the text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          height: '100%',
          width: '100%',
          background: 'rgba(0,0,0,0.8)',
        }}
      />

      {/* 3D Marquee — fills the entire container */}
      <ThreeDMarquee
        className="pointer-events-none"
        style={{
          position: 'absolute',
          inset: 0,
          height: '100%',
          width: '100%',
        }}
        images={images}
      />
    </div>
  );
}

export default ThreeDMarqueeDemoSecond;
