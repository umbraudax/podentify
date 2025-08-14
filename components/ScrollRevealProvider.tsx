'use client';

import { useEffect } from 'react';

export default function ScrollRevealProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (revealElements.length === 0) return;

    // Initialize transition delays from data attributes
    revealElements.forEach((el) => {
      const delayAttr = el.getAttribute('data-reveal-delay');
      if (delayAttr) {
        const delayMs = parseInt(delayAttr, 10);
        if (!Number.isNaN(delayMs)) {
          el.style.transitionDelay = `${delayMs}ms`;
        }
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
        threshold: 0.3,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}


