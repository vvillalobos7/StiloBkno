export default function Loading({ label = "Cargando..." }) {
  return (
    <div className="flex items-center gap-3 py-6 text-zinc-300">
      <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-zinc-200 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
