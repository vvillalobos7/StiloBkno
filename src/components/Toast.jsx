import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const toast = useCallback(
    (message, { type = "info", duration = 3500 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);

      timers.current[id] = setTimeout(() => dismiss(id), duration);

      return id;
    },
    [dismiss]
  );

  const success = useCallback((msg, opts) => toast(msg, { ...opts, type: "success" }), [toast]);
  const error = useCallback((msg, opts) => toast(msg, { ...opts, type: "error" }), [toast]);
  const warning = useCallback((msg, opts) => toast(msg, { ...opts, type: "warning" }), [toast]);

  return (
    <ToastCtx.Provider value={{ toast, success, error, warning, dismiss }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={[
              "pointer-events-auto cursor-pointer rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl",
              t.leaving ? "animate-toast-out" : "animate-toast-in",
              t.type === "success"
                ? "border-emerald-400/20 bg-emerald-950/80 text-emerald-100"
                : t.type === "error"
                ? "border-rose-400/20 bg-rose-950/80 text-rose-100"
                : t.type === "warning"
                ? "border-violet-400/20 bg-violet-950/80 text-violet-100"
                : "border-violet-500/15 bg-zinc-900/90 text-zinc-100",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">
                {t.type === "success" ? "✅" : t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : "ℹ️"}
              </span>
              <span className="flex-1 leading-relaxed">{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
