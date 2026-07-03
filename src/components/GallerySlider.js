"use client";
import { useState, useEffect, useRef } from "react";

export default function GallerySlider({ images }) {
  const [cur, setCur] = useState(0);
  const curRef = useRef(0);
  const paused = useRef(false);
  const n = images.length;

  function goTo(i) {
    curRef.current = i;
    setCur(i);
  }

  useEffect(() => {
    const t = setInterval(() => {
      if (!paused.current) goTo((curRef.current + 1) % n);
    }, 4500);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) return null;

  // 3 fotoğraf: önceki (solda), şimdiki (ortada-büyük), sonraki (sağda)
  const prev = (cur - 1 + n) % n;
  const next = (cur + 1) % n;
  const trio = n < 3 ? [cur] : [prev, cur, next];

  return (
    <div
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      <div className="flex items-stretch gap-2 px-4 max-w-5xl mx-auto" style={{ height: "52vh" }}>
        {trio.map((idx, pos) => {
          const isCenter = trio.length === 1 || pos === 1;
          return (
            <div
              key={idx}
              onClick={() => goTo(idx)}
              className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ${
                isCenter
                  ? "flex-[2] opacity-100"
                  : "flex-1 opacity-50 hover:opacity-70 scale-y-95"
              }`}
            >
              <img
                src={images[idx]}
                alt={`Galerie ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              {isCenter && (
                <span className="absolute top-4 right-4 text-white/70 text-xs font-mono tabular-nums select-none">
                  {String(cur + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 mt-5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Bild ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === cur ? "w-8 bg-terra" : "w-2 bg-coffee/25 hover:bg-coffee/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
