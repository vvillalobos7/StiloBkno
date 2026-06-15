import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function HeroBanner({ banners = [] }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const count = banners.length;

  const go = useCallback(
    (n) => {
      if (count === 0) return;
      setIdx((n + count) % count);
    },
    [count]
  );

  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);

  // Autoplay
  useEffect(() => {
    if (count <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [count, next]);

  // Reset timer on manual interaction
  const interact = (fn) => () => {
    clearInterval(timerRef.current);
    fn();
    if (count > 1) timerRef.current = setInterval(next, 5000);
  };

  if (count === 0) return null;

  const current = banners[idx];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-violet-500/15 bg-zinc-900/40">
        {/* Image */}
        <div className="relative aspect-[21/9] sm:aspect-[21/8] md:aspect-[21/7]">
          <img
            key={current.id}
            src={current.imageUrl}
            alt={current.title ?? "Banner"}
            className="absolute inset-0 h-full w-full object-cover animate-banner"
            loading="eager"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 md:p-10">
          <div className="max-w-lg">
            {current.title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight animate-slide-up">
                {current.title}
              </h2>
            )}
            {current.subtitle && (
              <p className="mt-2 text-sm sm:text-base text-zinc-300 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
                {current.subtitle}
              </p>
            )}
            {current.link && (
              <Link
                to={current.link}
                className="mt-4 inline-flex rounded-xl btn-accent px-5 py-2.5 text-sm animate-slide-up"
                style={{ animationDelay: "0.2s" }}
              >
                Ver más →
              </Link>
            )}
          </div>
        </div>

        {/* Prev / Next */}
        {count > 1 && (
          <>
            <button
              onClick={interact(prev)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-2xl bg-zinc-950/60 border border-violet-500/15 text-white grid place-items-center hover:bg-zinc-950/80 transition"
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              onClick={interact(next)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-2xl bg-zinc-950/60 border border-violet-500/15 text-white grid place-items-center hover:bg-zinc-950/80 transition"
              aria-label="Siguiente"
            >
              ›
            </button>
          </>
        )}

        {/* Dots */}
        {count > 1 && (
          <div className="absolute bottom-3 right-5 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={interact(() => go(i))}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === idx ? "w-6 bg-white" : "w-2 bg-white/30 hover:bg-violet-500/100"
                }`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
