import { supabaseServeur } from "@/lib/supabase";
import AssistantWidget from "@/components/AssistantWidget";
import { redirect } from "next/navigation";

export default async function Inventaire() {
  const sb = await supabaseServeur();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/connexion");

  // RLS : seules les lignes de l'organisation de l'utilisateur reviennent.
  const [{ data: equipements }, { data: resume }, { data: profil }] = await Promise.all([
    sb.from("equipements").select("*").order("nom"),
    sb.from("v_resume_inventaire").select("*").single(),
    sb.from("profils").select("nom_complet").eq("id", user.id).single()
  ]);

  return (
    <main>
      <h1>Mon inventaire</h1>
      <section className="kpis">
        <div><span>Équipements actifs</span><b>{resume?.actifs ?? 0}</b></div>
        <div><span>Garanties &lt; 90 j</span><b>{resume?.garanties_90j ?? 0}</b></div>
        <div><span>En réparation</span><b>{resume?.en_reparation ?? 0}</b></div>
        <div><span>Valeur du parc</span><b>{Number(resume?.valeur_parc ?? 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</b></div>
      </section>
      <table>
        <thead><tr><th>Équipement</th><th>Catégorie</th><th>No de série</th><th>Emplacement</th><th>Garantie</th><th>État</th></tr></thead>
        <tbody>{equipements?.map(e => (
          <tr key={e.id}><td><a href={`/inventaire/${e.id}`}>{e.nom}</a><br /><small>{e.fabricant} {e.modele}</small></td>
            <td>{e.categorie}</td><td><code>{e.no_serie}</code></td><td>{e.emplacement}</td><td>{e.fin_garantie}</td><td>{e.etat}</td></tr>
        ))}</tbody>
      </table>
      <AssistantWidget prenom={profil?.nom_complet?.split(" ")[0]} />
    </main>
  );
}
