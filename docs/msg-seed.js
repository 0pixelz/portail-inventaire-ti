/* Conversations de démonstration (client ↔ équipe). En production : table « messages » (RLS par organisation). */
window.__MSG_SEED = [
  { id: 't1', client: 'Clinique Dentaire Ste-Rose', contact: 'Marie Tremblay', sujet: 'Wi-Fi invités pour la journée portes ouvertes', tech: 'Jonathan', lien: '', luClient: '2026-09-30T09:00:00', luEquipe: '2026-10-01T16:40:00', messages: [
    { de: 'client', auteur: 'Marie Tremblay', date: '2026-09-30T08:52:00', texte: 'Bonjour Jonathan, nous avons une journée portes ouvertes le 17 octobre. Est-ce possible d’avoir un Wi-Fi invités séparé avec un mot de passe simple pour la journée ?' },
    { de: 'equipe', auteur: 'Jonathan', date: '2026-10-01T16:40:00', texte: 'Bonjour Marie, oui sans problème. Je crée un réseau « SteRose-Invites » isolé de vos postes, actif seulement le 17 octobre de 8 h à 18 h. Je vous envoie le mot de passe la veille. Rien à faire de votre côté.' }
  ] },
  { id: 't2', client: 'Clinique Dentaire Ste-Rose', contact: 'Marie Tremblay', sujet: 'Question sur la facture F-2026-0198', tech: 'Jonathan', lien: 'facture.html', luClient: '2026-09-03T10:00:00', luEquipe: '2026-09-03T10:00:00', messages: [
    { de: 'client', auteur: 'Marie Tremblay', date: '2026-09-02T14:10:00', texte: 'La ligne « Installation sur place » est facturée deux fois sur la facture d’août, est-ce normal ?' },
    { de: 'equipe', auteur: 'Jonathan', date: '2026-09-02T15:25:00', texte: 'Bonne remarque : il y avait deux déplacements (le 18 et le 22 août) pour les deux portables. Le détail est maintenant indiqué sur la facture. Merci de nous l’avoir signalé !' },
    { de: 'client', auteur: 'Marie Tremblay', date: '2026-09-03T09:58:00', texte: 'Parfait, merci pour la précision.' }
  ] },
  { id: 't3', client: 'Garderie Les Lucioles', contact: 'Sophie Côté', sujet: 'Tablettes des éducatrices après la panne', tech: 'Samuel', lien: 'billet.html', luClient: '2026-10-02T07:50:00', luEquipe: '2026-10-01T12:00:00', messages: [
    { de: 'equipe', auteur: 'Samuel', date: '2026-10-01T12:35:00', texte: 'Le réseau est rétabli : nouveau routeur configuré, les 14 postes sont en ligne.' },
    { de: 'client', auteur: 'Sophie Côté', date: '2026-10-02T07:48:00', texte: 'Merci Samuel ! Par contre deux tablettes des éducatrices (salle des poupons) ne se reconnectent pas au Wi-Fi ce matin. Est-ce qu’on doit faire quelque chose ?' }
  ] },
  { id: 't4', client: 'Groupe Auto Laurentides', contact: 'Martin Lévesque', sujet: 'Visite de mercredi — accès aux ateliers', tech: 'Samuel', lien: 'admin-visite.html', luClient: '2026-10-01T18:05:00', luEquipe: '2026-09-30T17:00:00', messages: [
    { de: 'client', auteur: 'Martin Lévesque', date: '2026-10-01T18:02:00', texte: 'Bonjour, pour la visite du 7 octobre : les techniciens de l’atelier commencent à 7 h 30. Votre technicien peut-il arriver tôt pour inventorier les tablettes de diagnostic avant qu’elles partent sur les véhicules ?' }
  ] },
  { id: 't5', client: 'Studio Nord Design', contact: 'Julie D.', sujet: 'Livraison des écrans (commande C-118)', tech: 'Karine', lien: 'admin-commande.html', luClient: '2026-10-01T11:00:00', luEquipe: '2026-10-01T11:00:00', messages: [
    { de: 'client', auteur: 'Julie D.', date: '2026-09-30T10:12:00', texte: 'Est-ce que les deux écrans peuvent être installés jeudi prochain en après-midi ? Le matin nous avons une présentation client.' },
    { de: 'equipe', auteur: 'Karine', date: '2026-10-01T10:55:00', texte: 'C’est noté : jeudi 8 octobre, 13 h à 15 h. J’apporte aussi les câbles USB-C pour vos portables.' }
  ] },
  { id: 't6', client: 'Comptabilité Marchand', contact: 'Pierre Marchand', sujet: 'Nouvel employé lundi', tech: '', lien: 'billet.html', luClient: '2026-10-01T09:05:00', luEquipe: '2026-09-28T00:00:00', messages: [
    { de: 'client', auteur: 'Pierre Marchand', date: '2026-10-01T09:03:00', texte: 'Bonjour, une nouvelle comptable commence lundi 5 octobre. Il lui faudrait un poste, une adresse courriel et l’accès au logiciel d’impôts. Pouvez-vous préparer ça ?' }
  ] }
];
