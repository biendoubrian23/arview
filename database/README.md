# Base de données ScanAR

Exécute ces scripts dans **l'ordre** dans le SQL Editor de Supabase
(`https://supabase.com/dashboard/project/<ton-projet>/sql/new`).

| Ordre | Fichier              | Contenu |
| ----- | -------------------- | ------- |
| 1     | `01_schema.sql`      | Tables `profiles`, `models`, `events`, triggers `handle_new_user` et `updated_at` |
| 2     | `02_policies.sql`    | Activation du RLS et toutes les policies |
| 3     | `03_storage.sql`     | Création du bucket public `models` + policies storage |

> ℹ️ Sur Supabase, la confirmation par email est **désactivée** (réglage déjà fait
> dans Authentication → Providers → Email).
> L'utilisateur arrive donc directement sur `/dashboard` après inscription.

## Re-exécution
Tous les scripts sont **idempotents** (`if not exists`, `drop policy if exists`, …)
donc tu peux les rejouer sans risque.
