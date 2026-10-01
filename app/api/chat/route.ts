import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseServeur } from "@/lib/supabase";

// ------------------------------------------------------------
// Assistant support IA : répond au client à partir de SON inventaire.
// L'isolation multi-clients est garantie par RLS : le client Supabase est
// authentifié comme l'utilisateur, donc les outils ne peuvent lire que son organisation.
// ------------------------------------------------------------

const anthropic = new Anthropic();

const outils: Anthropic.Tool[] = [
  {
    name: "chercher_equipements",
    description: "Recherche dans l'inventaire du client par nom, modèle, no de série, emplacement ou catégorie. Retourne aussi l'état et la fin de garantie.",
    input_schema: {
      type: "object",
      properties: {
        recherche: { type: "string", description: "Texte libre (ex. 'écran salle 3')" },
        etat: { type: "string", enum: ["actif", "reparation", "retire"] },
        garantie_dans_jours: { type: "integer", description: "Ne garder que les garanties se terminant d'ici N jours" }
      }
    }
  },
  {
    name: "historique_equipement",
    description: "Historique complet d'un équipement (installation, déplacements, réparations) et billets ouverts.",
    input_schema: { type: "object", properties: { equipement_id: { type: "string" } }, required: ["equipement_id"] }
  },
  {
    name: "creer_billet",
    description: "Crée un billet de support pour le client quand il signale un problème ou quand tu ne peux pas répondre. Un technicien prend le relais.",
    input_schema: {
      type: "object",
      properties: {
        titre: { type: "string" },
        description: { type: "string" },
        equipement_id: { type: "string" },
        priorite: { type: "string", enum: ["basse", "normale", "haute"] }
      },
      required: ["titre", "description"]
    }
  }
];

async function executerOutil(sb: Awaited<ReturnType<typeof supabaseServeur>>, nom: string, args: any, orgId: string) {
  if (nom === "chercher_equipements") {
    let q = sb.from("equipements")
      .select("id, nom, categorie, fabricant, modele, no_serie, emplacement, utilisateur_assigne, etat, fin_garantie, date_installation")
      .limit(20);
    if (args.recherche) q = q.or(`nom.ilike.%${args.recherche}%,modele.ilike.%${args.recherche}%,no_serie.ilike.%${args.recherche}%,emplacement.ilike.%${args.recherche}%,categorie.ilike.%${args.recherche}%`);
    if (args.etat) q = q.eq("etat", args.etat);
    if (args.garantie_dans_jours) {
      const lim = new Date(); lim.setDate(lim.getDate() + args.garantie_dans_jours);
      q = q.gte("fin_garantie", new Date().toISOString().slice(0, 10)).lte("fin_garantie", lim.toISOString().slice(0, 10));
    }
    const { data, error } = await q;
    return error ? { erreur: error.message } : { equipements: data };
  }
  if (nom === "historique_equipement") {
    const [h, b] = await Promise.all([
      sb.from("historique").select("type, titre, detail, date_evenement").eq("equipement_id", args.equipement_id).order("date_evenement", { ascending: false }),
      sb.from("billets").select("id, titre, statut, priorite, cree_le").eq("equipement_id", args.equipement_id).neq("statut", "ferme")
    ]);
    return { historique: h.data ?? [], billets_ouverts: b.data ?? [] };
  }
  if (nom === "creer_billet") {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("billets").insert({
      organisation_id: orgId, equipement_id: args.equipement_id ?? null,
      titre: args.titre, description: args.description, priorite: args.priorite ?? "normale",
      cree_par: user?.id, source: "assistant_ia"
    }).select("id").single();
    return error ? { erreur: error.message } : { billet_cree: data.id };
  }
  return { erreur: "outil inconnu" };
}

export async function POST(req: Request) {
  const sb = await supabaseServeur();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "non authentifié" }, { status: 401 });

  const { data: profil } = await sb.from("profils").select("nom_complet, organisation_id, organisations(nom)").eq("id", user.id).single();
  if (!profil?.organisation_id) return NextResponse.json({ erreur: "aucune organisation" }, { status: 403 });

  const { messages } = await req.json() as { messages: Anthropic.MessageParam[] };

  const system = `Tu es l'assistant de support TI de [VOTRE ENTREPRISE] pour le client « ${(profil as any).organisations?.nom} ».
Tu parles à ${profil.nom_complet ?? "un utilisateur"} en français, de façon brève et concrète.
Tu ne connais QUE l'inventaire de ce client, via les outils. N'invente jamais un équipement, une date ou un prix : utilise les outils.
Si le client signale un problème ou si tu ne peux pas répondre, propose de créer un billet puis crée-le avec creer_billet.
Ne donne jamais d'information sur d'autres clients. Termine par une action possible quand c'est pertinent.`;

  // Boucle d'outils : on laisse le modèle appeler les outils jusqu'à sa réponse finale.
  let conv: Anthropic.MessageParam[] = [...messages];
  for (let i = 0; i < 6; i++) {
    const rep = await anthropic.messages.create({
      model: "claude-sonnet-5-5", max_tokens: 1024, system, tools: outils, messages: conv
    });
    conv.push({ role: "assistant", content: rep.content });
    if (rep.stop_reason !== "tool_use") {
      const texte = rep.content.filter(b => b.type === "text").map(b => (b as any).text).join("\n");
      // Audit : on conserve la conversation (utile si un technicien prend le relais)
      await sb.from("conversations_ia").insert({ organisation_id: profil.organisation_id, utilisateur_id: user.id, messages: conv });
      return NextResponse.json({ reponse: texte, messages: conv });
    }
    const resultats: Anthropic.ToolResultBlockParam[] = [];
    for (const bloc of rep.content) {
      if (bloc.type === "tool_use") {
        const r = await executerOutil(sb, bloc.name, bloc.input, profil.organisation_id);
        resultats.push({ type: "tool_result", tool_use_id: bloc.id, content: JSON.stringify(r) });
      }
    }
    conv.push({ role: "user", content: resultats });
  }
  return NextResponse.json({ reponse: "Je n'arrive pas à terminer — un technicien va vous contacter.", messages: conv });
}
