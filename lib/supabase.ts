import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase côté serveur, authentifié comme l'utilisateur courant (RLS appliqué).
export async function supabaseServeur() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: (l) => l.forEach(c => store.set(c.name, c.value, c.options)) } }
  );
}
