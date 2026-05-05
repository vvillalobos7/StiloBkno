import { moneyCLP } from "../utils/format";

export default function ProductModal({ open, onClose, product, imageUrl, onAdd }) {
  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-violet-500/15 bg-zinc-950 overflow-hidden shadow-2xl shadow-violet-500/10 animate-slide-up">
        <div className="grid md:grid-cols-2">
          <div className="aspect-square bg-zinc-900/30 overflow-hidden">
            {product.image_path ? (
              <img className="h-full w-full object-cover" src={imageUrl(product.image_path)} alt={product.name} />
            ) : (
              <div className="h-full grid place-items-center text-zinc-600 text-sm">Sin imagen</div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-violet-400 font-semibold">StiloBkno • Premium Drop</div>
                <h3 className="text-2xl font-extrabold tracking-tight mt-1">{product.name}</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-2xl border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5 transition"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 text-zinc-400 text-sm leading-relaxed">
              {product.description || "Producto premium seleccionado para tu estilo."}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="text-2xl font-extrabold text-gradient">${moneyCLP(product.price)}</div>
              <span className="text-xs px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-200">
                Stock por encargo
              </span>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={onAdd}
                className="flex-1 rounded-2xl btn-accent py-3 text-sm"
              >
                Agregar al carrito
              </button>
              <button
                onClick={onClose}
                className="rounded-2xl border border-violet-500/20 px-4 py-3 text-sm text-violet-200 hover:bg-violet-500/10 transition"
              >
                Seguir mirando
              </button>
            </div>

            <div className="mt-5 text-xs text-zinc-600">
              Tip: agrega tus notas (talla/color) al finalizar el pedido.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
