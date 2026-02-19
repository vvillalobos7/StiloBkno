import { moneyCLP } from "../utils/Format";

export default function ProductCard({ product, imageUrl, onAdd, onQuickView }) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-zinc-900/30 overflow-hidden hover:bg-zinc-900/50 transition">
      <button onClick={onQuickView} className="relative w-full text-left">
        <div className="aspect-square bg-gradient-to-b from-white/5 to-transparent">
          {product.image_path ? (
            <img
              src={imageUrl(product.image_path)}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full grid place-items-center text-zinc-500 text-sm">
              Sin imagen
            </div>
          )}
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-950/70 border border-white/10 text-zinc-200">
            Trend
          </span>
          <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-zinc-200">
            Drop
          </span>
        </div>
      </button>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold leading-tight">{product.name}</div>
            <div className="text-xs text-zinc-400 line-clamp-2 mt-1">{product.description}</div>
          </div>
          <div className="font-extrabold tracking-tight whitespace-nowrap">
            ${moneyCLP(product.price)}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onAdd}
            className="flex-1 rounded-2xl bg-white text-zinc-950 font-semibold py-2 hover:opacity-90 active:opacity-80"
          >
            Agregar
          </button>
          <button
            onClick={onQuickView}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            title="Vista rápida"
          >
            👁
          </button>
        </div>
      </div>
    </div>
  );
}
