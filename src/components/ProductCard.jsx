import { Link } from "react-router-dom";
import { moneyCLP } from "../utils/format";

export default function ProductCard({ product, imageUrl, onAdd }) {
  return (
    <div className="group rounded-3xl border border-violet-500/10 bg-zinc-900/40 overflow-hidden card-hover">
      <Link to={`/producto/${product.id}`} className="relative block w-full text-left">
        <div className="aspect-square bg-gradient-to-b from-violet-500/5 to-transparent overflow-hidden">
          {product.image_path ? (
            <img
              src={imageUrl(product.image_path)}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="h-full grid place-items-center text-zinc-600 text-sm">
              Sin imagen
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* "Ver producto" label on hover */}
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-sm font-medium text-white bg-zinc-950/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
              Ver producto →
            </span>
          </div>
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/20 text-violet-200 backdrop-blur-sm">
            Trend
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-fuchsia-500/15 border border-fuchsia-500/20 text-fuchsia-200 backdrop-blur-sm">
            Drop
          </span>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              to={`/producto/${product.id}`}
              className="font-semibold leading-tight group-hover:text-violet-200 transition-colors hover:underline"
            >
              {product.name}
            </Link>
            <div className="text-xs text-zinc-500 line-clamp-2 mt-1">{product.description}</div>
          </div>
          <div className="font-semibold tracking-tight whitespace-nowrap text-gradient">
            ${moneyCLP(product.price)}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex-1 rounded-xl btn-accent py-2 text-sm"
            >
              Agregar
            </button>
          )}
          <Link
            to={`/producto/${product.id}`}
            className="rounded-xl btn-secondary px-3.5 py-2 text-sm"
            title="Ver producto"
          >
            👁
          </Link>
        </div>
      </div>
    </div>
  );
}
