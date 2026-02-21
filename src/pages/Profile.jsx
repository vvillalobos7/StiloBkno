import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";

function uid() {
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [file, setFile] = useState(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState(null);

  const load = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const u = authData?.user ?? null;
    setUser(u);

    if (!u) {
      setProfile(null);
      setAvatarSignedUrl(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_path")
      .eq("id", u.id)
      .single();

    if (error) console.error(error);
    const p = data ?? { id: u.id, full_name: "", phone: "", avatar_path: null };
    setProfile(p);

    if (p.avatar_path) {
      const { data: signed, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(p.avatar_path, 60 * 60); // 1 hora

      if (sErr) console.error(sErr);
      setAvatarSignedUrl(signed?.signedUrl ?? null);
    } else {
      setAvatarSignedUrl(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadAvatarIfAny = async () => {
    if (!file || !user) return profile?.avatar_path ?? null;

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${uid()}.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
    });

    if (error) throw error;
    return path;
  };

  const save = async () => {
    if (!user) return alert("Debes iniciar sesión.");
    setSaving(true);

    try {
      const avatarPath = await uploadAvatarIfAny();

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: (profile?.full_name ?? "").trim(),
          phone: (profile?.phone ?? "").trim(),
          avatar_path: avatarPath,
        })
        .eq("id", user.id);

      if (error) throw error;

      setFile(null);
      await load();
      alert("Perfil actualizado ✅");
    } catch (e) {
      console.error(e);
      alert(`Error: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    location.href = "/";
  };

  const initials = useMemo(() => {
    const name = (profile?.full_name ?? "").trim();
    if (!name) return "🙂";
    return name.split(" ").slice(0, 2).map((x) => x[0]?.toUpperCase()).join("");
  }, [profile?.full_name]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Mi perfil" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Perfil</h1>
              <p className="text-sm text-zinc-400 mt-1">Edita tu nombre, teléfono y foto.</p>
            </div>

            {user ? (
              <button
                onClick={signOut}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                Cerrar sesión
              </button>
            ) : null}
          </div>

          {loading ? (
            <Loading label="Cargando perfil..." />
          ) : !user ? (
            <div className="mt-6 text-sm text-zinc-300">
              Debes iniciar sesión.{" "}
              <a className="underline text-zinc-200" href="/auth">
                Ir a login
              </a>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-3xl overflow-hidden bg-white/5 border border-white/10">
                  {avatarSignedUrl ? (
                    <img className="h-full w-full object-cover" src={avatarSignedUrl} alt="avatar" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-zinc-300 font-extrabold">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-xs text-zinc-400">Foto de perfil</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-2 text-sm text-zinc-300"
                  />
                  <div className="text-xs text-zinc-500 mt-2">
                    Bucket privado ✅ (se muestra con link firmado).
                  </div>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-xs text-zinc-400">Nombre</span>
                <input
                  className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={profile?.full_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Tu nombre"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs text-zinc-400">Teléfono</span>
                <input
                  className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={profile?.phone ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Ej: +56 9 1234 5678"
                />
              </label>

              <button
                onClick={save}
                disabled={saving}
                className="rounded-2xl bg-white text-zinc-950 font-extrabold px-6 py-3 hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
