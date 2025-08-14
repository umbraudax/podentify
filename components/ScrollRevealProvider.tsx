'use client';

import { useEffect } from 'react';

export default function ScrollRevealProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (revealElements.length === 0) return;

    // Initialize transition delays from data attributes, speed up on mobile
    revealElements.forEach((el) => {
      const delayAttr = el.getAttribute('data-reveal-delay');
      if (delayAttr) {
        const delayMs = parseInt(delayAttr, 10);
        if (!Number.isNaN(delayMs)) {
          const effectiveDelay = isMobile ? Math.floor(delayMs * 0.5) : delayMs;
          el.style.transitionDelay = `${effectiveDelay}ms`;
        }
      }
      // Also shorten transition duration on mobile
      if (isMobile) {
        const existing = getComputedStyle(el).transitionDuration;
        // If we have a duration, halve it; fallback to 300ms
        const firstDuration = existing.split(',')[0]?.trim() || '300ms';
        let ms = 300;
        if (firstDuration.endsWith('ms')) {
          ms = parseFloat(firstDuration);
        } else if (firstDuration.endsWith('s')) {
          ms = parseFloat(firstDuration) * 1000;
        }
        const newMs = Math.max(150, Math.floor(ms * 0.6));
        el.style.transitionDuration = `${newMs}ms`;
      }
    });

    // If user prefers reduced motion, reveal everything immediately
    if (prefersReducedMotion) {
      revealElements.forEach((el) => el.classList.add('reveal-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add('reveal-in');
          } else {
            el.classList.remove('reveal-in');
          }
        });
      },
      {
        // Lower threshold and increase rootMargin on mobile so items reveal sooner
        threshold: isMobile ? 0.15 : 0.3,
        rootMargin: isMobile ? '10% 0px -10% 0px' : '0px 0px -10% 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}


