import { useEffect, useRef } from "react";

/**
 * ScrollReveal component — wraps children and reveals them on scroll
 * using IntersectionObserver + CSS classes from index.css (.sr, .sr-scale)
 *
 * Usage:
 *   <SR>content</SR>
 *   <SR delay={2}>delayed content</SR>
 *   <SR variant="scale">scale up</SR>
 */
export default function SR({ children, delay = 0, variant = "default", className = "", threshold = 0.15 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const baseClass = variant === "scale" ? "sr-scale" : "sr";
  const delayClass = delay > 0 ? `sr-delay-${delay}` : "";

  return (
    <div ref={ref} className={`${baseClass} ${delayClass} ${className}`}>
      {children}
    </div>
  );
}
