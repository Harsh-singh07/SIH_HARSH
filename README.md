# Kisan Setu

Kisan Setu is a role-based mandi procurement coordination prototype for farmers, centre operators, and administrators. It combines capacity-based slot booking, digital tokens, queue visibility, procurement status updates, staff management, and recorded payment amounts.

## Portals

- Farmer and operator sign-in: `http://localhost:8080/public/login.html`
- Farmer landing page: `http://localhost:8080/`
- Administrator sign-in: `http://localhost:8080/admin/login.html`

## Main features

- Farmer registration, slot booking, token, gate pass, inbox, history, and live queue view
- Centre-operator console with date/search/status filters and controlled booking progression
- Operator-recorded farmer payment amount after procurement
- Admin centre, slot, booking, and staff management
- Supabase Authentication, PostgreSQL, Row Level Security, Realtime, and an Edge Function for operator creation

## Run locally

Serve the repository root with any static HTTP server. For example:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Then open `http://localhost:8080/`.

## Supabase setup

1. Create or select a Supabase project.
2. Copy `public/js/config.example.js` to `public/js/config.js`, then add the project URL and publishable key to the local copy. `config.js` is ignored by Git.
3. Apply the SQL files in `supabase/migrations/` in filename order.
4. Deploy `supabase/functions/create-staff`.
5. Configure the Edge Function secrets required by the Supabase client and service-role client.

The latest migration adds `amount_paid` and `paid_at` to bookings so operators can record the final amount paid to a farmer.

## Current scope

This repository is a working hackathon prototype. Before a production pilot, token allocation should be made atomic, operator workflows should receive field validation, and offline access should be added for essential gate-pass information.
