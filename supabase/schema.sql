-- ============================================================
-- Portail inventaire TI — schéma multi-clients (Supabase/Postgres)
-- Chaque client = une "organisation". Chaque utilisateur appartient à une seule organisation.
-- La sécurité repose sur RLS : un utilisateur ne voit que les lignes de son organisation.
-- ============================================================

create extension if not exists "pgcrypto";

-- Clients
create table organisations (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  courriel_contact text,
  cree_le     timestamptz not null default now()
);

-- Profil lié à auth.users (créé automatiquement par trigger ci-dessous)
create table profils (
  id              uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid references organisations(id) on delete set null,
  nom_complet     text,
  role            text not null default 'client' check (role in ('client','admin_client','technicien','admin')),
  cree_le         timestamptz not null default now()
);

create function public.creer_profil() returns trigger language plpgsql security definer as $$
begin
  insert into public.profils (id, nom_complet) values (new.id, new.raw_user_meta_data->>'nom_complet');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.creer_profil();

-- Fonction utilitaire : organisation de l'utilisateur courant
create function public.mon_organisation() returns uuid language sql stable security definer as $$
  select organisation_id from public.profils where id = auth.uid()
$$;
create function public.est_technicien() returns boolean language sql stable security definer as $$
  select role in ('technicien','admin') from public.profils where id = auth.uid()
$$;

-- Équipements
create table equipements (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  nom             text not null,              -- "Poste réception 1"
  categorie       text not null,              -- poste, portable, ecran, reseau, imprimante, autre
  fabricant       text,
  modele          text,
  no_serie        text,
  emplacement     text,
  utilisateur_assigne text,
  etat            text not null default 'actif' check (etat in ('actif','reparation','retire')),
  date_installation date,
  fin_garantie    date,
  prix_achat      numeric(10,2),
  notes           text,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);
create index on equipements (organisation_id);
create unique index on equipements (organisation_id, no_serie) where no_serie is not null;

-- Historique d'un équipement (installé, déplacé, réparé, retiré…)
create table historique (
  id              uuid primary key default gen_random_uuid(),
  equipement_id   uuid not null references equipements(id) on delete cascade,
  organisation_id uuid not null references organisations(id) on delete cascade,
  type            text not null,              -- installation, deplacement, reparation, retour, retrait, note
  titre           text not null,
  detail          text,
  auteur_id       uuid references profils(id),
  date_evenement  timestamptz not null default now()
);
create index on historique (equipement_id, date_evenement desc);

-- Billets de support (créés par le client, l'assistant IA ou un technicien)
create table billets (
  id              serial primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  equipement_id   uuid references equipements(id) on delete set null,
  titre           text not null,
  description     text,
  statut          text not null default 'ouvert' check (statut in ('ouvert','en_cours','attente_client','ferme')),
  priorite        text not null default 'normale' check (priorite in ('basse','normale','haute')),
  cree_par        uuid references profils(id),
  source          text not null default 'portail' check (source in ('portail','assistant_ia','technicien','courriel')),
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);

-- Conversations avec l'assistant (pour audit + reprise par un technicien)
create table conversations_ia (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  utilisateur_id  uuid not null references profils(id),
  messages        jsonb not null default '[]',
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);

-- Phase 2 : catalogue et commandes
create table produits (
  id          uuid primary key default gen_random_uuid(),
  sku         text unique,
  nom         text not null,
  categorie   text not null,
  description text,
  prix        numeric(10,2) not null,
  actif       boolean not null default true
);
-- Prix négocié par client (facultatif ; sinon prix catalogue)
create table prix_clients (
  organisation_id uuid references organisations(id) on delete cascade,
  produit_id      uuid references produits(id) on delete cascade,
  prix            numeric(10,2) not null,
  primary key (organisation_id, produit_id)
);
create table commandes (
  id              serial primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  cree_par        uuid references profils(id),
  statut          text not null default 'soumise' check (statut in ('panier','soumise','approuvee','livree','annulee')),
  emplacement_livraison text,
  remplace_equipement_id uuid references equipements(id),
  sous_total      numeric(10,2),
  taxes           numeric(10,2),
  total           numeric(10,2),
  cree_le         timestamptz not null default now()
);
create table commande_lignes (
  id            uuid primary key default gen_random_uuid(),
  commande_id   int not null references commandes(id) on delete cascade,
  produit_id    uuid not null references produits(id),
  quantite      int not null check (quantite > 0),
  prix_unitaire numeric(10,2) not null
);

-- ============================================================
-- RLS : chaque client ne voit que son organisation ; techniciens voient tout
-- ============================================================
alter table organisations   enable row level security;
alter table profils         enable row level security;
alter table equipements     enable row level security;
alter table historique      enable row level security;
alter table billets         enable row level security;
alter table conversations_ia enable row level security;
alter table produits        enable row level security;
alter table prix_clients    enable row level security;
alter table commandes       enable row level security;
alter table commande_lignes enable row level security;

create policy "org: lecture propre" on organisations for select using (id = mon_organisation() or est_technicien());
create policy "profil: soi ou tech" on profils for select using (id = auth.uid() or est_technicien());

create policy "equip: lecture" on equipements for select using (organisation_id = mon_organisation() or est_technicien());
create policy "equip: ecriture tech" on equipements for all using (est_technicien()) with check (est_technicien());

create policy "hist: lecture" on historique for select using (organisation_id = mon_organisation() or est_technicien());
create policy "hist: ecriture tech" on historique for all using (est_technicien()) with check (est_technicien());

create policy "billet: lecture" on billets for select using (organisation_id = mon_organisation() or est_technicien());
create policy "billet: creation client" on billets for insert with check (organisation_id = mon_organisation());
create policy "billet: maj tech" on billets for update using (est_technicien());

create policy "conv: propre" on conversations_ia for all
  using (utilisateur_id = auth.uid() or est_technicien()) with check (utilisateur_id = auth.uid());

create policy "produits: tous connectes" on produits for select using (auth.uid() is not null and actif);
create policy "prix: propre" on prix_clients for select using (organisation_id = mon_organisation() or est_technicien());
create policy "cmd: lecture" on commandes for select using (organisation_id = mon_organisation() or est_technicien());
create policy "cmd: creation" on commandes for insert with check (organisation_id = mon_organisation());
create policy "lignes: via commande" on commande_lignes for all
  using (exists (select 1 from commandes c where c.id = commande_id and (c.organisation_id = mon_organisation() or est_technicien())));

-- Vue pratique pour le tableau de bord
create view v_resume_inventaire as
select organisation_id,
  count(*) filter (where etat = 'actif')       as actifs,
  count(*) filter (where etat = 'reparation')  as en_reparation,
  count(*) filter (where fin_garantie between current_date and current_date + 90) as garanties_90j,
  coalesce(sum(prix_achat),0)                  as valeur_parc
from equipements group by organisation_id;
