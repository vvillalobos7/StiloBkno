import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Hook that checks if the current logged-in user has the "admin" role
 * in the profiles table. Returns { isAdmin, loading, user }.
 */
export default function useAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getSession();
      const session = authData?.session;

      if (!session?.user) {
        if (!cancelled) {
          setIsAdmin(false);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const u = session.user;
      if (!cancelled) setUser(u);

      // Check profile role
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", u.id)
        .single();

      if (!cancelled) {
        if (error) {
          console.error("useAdmin profile check error:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(profile?.role === "admin");
        }
        setLoading(false);
      }
    };

    check();

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        if (!session) {
          setIsAdmin(false);
          setUser(null);
          setLoading(false);
        } else {
          // Re-check admin status on auth change
          check();
        }
      }
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return { isAdmin, loading, user };
}
