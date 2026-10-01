"use client";
import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: any };

export default function AssistantWidget({ prenom }: { prenom?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [charge, setCharge] = useState(false);
  const [affichage, setAffichage] = useState<{ de: "moi" | "ia"; t: string }[]>([
    { de: "ia", t: `Bonjour${prenom ? " " + prenom : ""} ! Je peux vous renseigner sur vos équipements, vos garanties ou l'état d'une réparation.` }
  ]);
  const [historique, setHistorique] = useState<Msg[]>([]); // historique complet (avec blocs d'outils) pour l'API

  async function envoyer() {
    if (!texte.trim() || charge) return;
    const q = texte.trim(); setTexte("");
    setAffichage(a => [...a, { de: "moi", t: q }]); setCharge(true);
    const messages = [...historique, { role: "user", content: q } as Msg];
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
    const j = await r.json();
    setHistorique(j.messages ?? messages);
    setAffichage(a => [...a, { de: "ia", t: j.reponse ?? j.erreur ?? "Erreur." }]); setCharge(false);
  }

  return (
    <>
      {ouvert && (
        <section className="assistant" aria-label="Assistant TI">
          <header><strong>Assistant TI</strong><span>Connaît votre inventaire</span>
            <button aria-label="Fermer" onClick={() => setOuvert(false)}>×</button></header>
          <div className="fil">
            {affichage.map((m, i) => <div key={i} className={m.de}>{m.t}</div>)}
            {charge && <div className="ia">…</div>}
          </div>
          <form onSubmit={e => { e.preventDefault(); envoyer(); }}>
            <input value={texte} onChange={e => setTexte(e.target.value)} placeholder="Posez une question sur votre parc…" aria-label="Votre message" />
            <button type="submit" aria-label="Envoyer">➤</button>
          </form>
          <small>Assistant IA · un technicien peut prendre le relais à tout moment</small>
        </section>
      )}
      <button className="assistant-bulle" aria-label="Ouvrir l'assistant" onClick={() => setOuvert(o => !o)}>🤖</button>
    </>
  );
}
