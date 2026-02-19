import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const BUSINESS_ID = import.meta.env.VITE_BUSINESS_ID;

export const STORAGE_BUCKET = "product-images";
