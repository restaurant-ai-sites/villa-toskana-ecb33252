"use client";

import { useEffect } from "react";

/**
 * Sayfadaki tüm ana section'ları scroll'da yumuşakça belirtir.
 * - JS yüklenmezse hiçbir şey gizlenmez (reveal-ready eklenmeden CSS pasif).
 * - Sonradan DOM'a eklenen section'lar (client-side fetch) MutationObserver
 *   ile yakalanır — aksi halde görünmez kalırlardı.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    document.documentElement.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );

    const observeAll = () => {
      document.querySelectorAll("main section:not([data-reveal-tracked])").forEach((el) => {
        el.setAttribute("data-reveal-tracked", "1");
        io.observe(el);
      });
    };

    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
