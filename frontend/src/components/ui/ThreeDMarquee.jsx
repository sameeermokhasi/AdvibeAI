/**
 * ThreeDMarquee — Advibe port of the Aceternity UI 3D Marquee component.
 *
 * Original: https://ui.aceternity.com/components/3d-marquee
 *
 * When used as a background:
 *   <ThreeDMarquee className="pointer-events-none absolute inset-0 h-full w-full" images={images} />
 * Sits in the back (perspective: 1000px, 3D rotated plane, non-blocking pointer events).
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

// ---------------------------------------------------------------------------
// GridLineHorizontal
// ---------------------------------------------------------------------------

function GridLineHorizontal({ style, offset = '20px' }) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 30,
        left: `calc(${offset} / 2 * -1)`,
        height: '1px',
        width: `calc(100% + ${offset})`,
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.18), rgba(255,255,255,0.18) 50%, transparent 0, transparent)',
        backgroundSize: '5px 1px',
        maskImage: [
          'linear-gradient(to left, #ffffff 90%, transparent)',
          'linear-gradient(to right, #ffffff 90%, transparent)',
          'linear-gradient(black, black)',
        ].join(', '),
        WebkitMaskImage: [
          'linear-gradient(to left, #ffffff 90%, transparent)',
          'linear-gradient(to right, #ffffff 90%, transparent)',
          'linear-gradient(black, black)',
        ].join(', '),
        maskComposite: 'exclude',
        WebkitMaskComposite: 'destination-out',
        pointerEvents: 'none',
        ...(style || {}),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// GridLineVertical
// ---------------------------------------------------------------------------

function GridLineVertical({ style, offset = '80px' }) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 30,
        left: '-4px',
        top: `calc(${offset} / 2 * -1)`,
        width: '1px',
        height: `calc(100% + ${offset})`,
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0.18) 50%, transparent 0, transparent)',
        backgroundSize: '1px 5px',
        maskImage: [
          'linear-gradient(to top, #ffffff 90%, transparent)',
          'linear-gradient(to bottom, #ffffff 90%, transparent)',
          'linear-gradient(black, black)',
        ].join(', '),
        WebkitMaskImage: [
          'linear-gradient(to top, #ffffff 90%, transparent)',
          'linear-gradient(to bottom, #ffffff 90%, transparent)',
          'linear-gradient(black, black)',
        ].join(', '),
        maskComposite: 'exclude',
        WebkitMaskComposite: 'destination-out',
        pointerEvents: 'none',
        ...(style || {}),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// ThreeDMarquee
// ---------------------------------------------------------------------------

export function ThreeDMarquee({ images, className = '', style = {} }) {
  // Reduced-motion support
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Responsive scale — check window width and update on resize
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1280) setScale(1);
      else if (window.innerWidth >= 768) setScale(0.75);
      else setScale(0.55);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Detect whether component is meant to fill the background
  const isFullscreen =
    className.includes('absolute') ||
    className.includes('fixed') ||
    className.includes('inset-0') ||
    style.position === 'absolute' ||
    style.position === 'fixed' ||
    style.height === '100%' ||
    style.height === '100vh';

  // Split images into 4 columns (same algorithm as source)
  const chunkSize = Math.ceil(images.length / 4);
  const chunks = Array.from({ length: 4 }, (_, colIndex) => {
    const start = colIndex * chunkSize;
    return images.slice(start, start + chunkSize);
  });

  return (
    <div
      className={className}
      style={{
        display: 'block',
        position: isFullscreen ? (style.position || 'absolute') : 'relative',
        inset: isFullscreen ? 0 : undefined,
        width: '100%',
        height: isFullscreen ? '100%' : '600px',
        overflow: 'hidden',
        borderRadius: isFullscreen ? 0 : '16px',
        pointerEvents: 'none',
        perspective: '1000px',
        WebkitPerspective: '1000px',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1000px',
          WebkitPerspective: '1000px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '1720px',
            height: '1720px',
            flexShrink: 0,
            transform: `scale(${scale})`,
            transition: 'transform 0.25s ease-out',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'relative',
              top: '384px',
              right: '50%',
              display: 'grid',
              width: '100%',
              height: '100%',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '32px',
              transformOrigin: 'top left',
              transform: 'rotateX(55deg) rotateY(0deg) rotateZ(-45deg)',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              pointerEvents: 'none',
            }}
          >
            {chunks.map((subarray, colIndex) => (
              <motion.div
                key={colIndex + 'marquee'}
                animate={reducedMotion ? { y: 0 } : { y: colIndex % 2 === 0 ? 100 : -100 }}
                transition={
                  reducedMotion
                    ? {}
                    : {
                        duration: colIndex % 2 === 0 ? 12 : 16,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                      }
                }
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '32px',
                  position: 'relative',
                  pointerEvents: 'none',
                }}
              >
                <GridLineVertical offset="80px" />
                {subarray.map((image, imageIndex) => (
                  <div
                    key={imageIndex + image}
                    style={{
                      position: 'relative',
                      pointerEvents: 'none',
                    }}
                  >
                    <GridLineHorizontal offset="20px" />
                    <img
                      src={image}
                      alt={`Showcase ${imageIndex + 1}`}
                      style={{
                        aspectRatio: '970 / 700',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        width: '970px',
                        height: '700px',
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
                        display: 'block',
                        pointerEvents: 'none',
                      }}
                      width={970}
                      height={700}
                      loading="lazy"
                    />
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThreeDMarquee;
