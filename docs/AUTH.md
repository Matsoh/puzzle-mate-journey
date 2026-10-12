# Innlogging og nettlagring

**Region:** Lovable Cloud, AWS eu-west-1 (Irland, EU).

## Opprette og godkjenne spilleren (eier)
1. Lovable → Cloud → Users → «Add user». Skriv spillerens e-post og et passord du velger selv.
   (Registrering fra appen er slått av på serveren.)
2. Godkjenn kontoen: be agenten «godkjenn <e-post>», eller kjør i Cloud → Database → SQL:
   `insert into public.approved_players (user_id) select id from auth.users where email = '<e-post>';`
3. Spilleren logger inn på /innlogging. Fjern tilgang: `delete from public.approved_players where user_id = …`.

## Sikkerhet
- `approved_players`: kun SELECT av egen rad; ingen klient kan skrive.
- `user_state`: RLS på SELECT/INSERT/UPDATE/DELETE = egen `auth.uid()` OG godkjent. anon har ingen tilgang.
- `save_user_state_for(p_user, …)`: optimistisk revisjon; avviser hvis p_user ≠ auth.uid().
- Verifisert i isolert PGlite med migrasjonsfilene uendret: `docs/rls-check.ts` (20 sjekker).

## Samtidighet
Tre-veis fletting mot sist bekreftede serverkopi: tellere og rating summerer uavhengige endringer,
XP-belønninger med hendelses-ID (`credits`) teller én gang. Spilleren ser en melding når fletting skjer.

## Begrensninger
- Ekte innlogging, e-postlenke for nytt passord og to fysiske enheter er ikke testet uten eierens konto.
- Samme pusle løst på to enheter samtidig teller to forsøk (ikke ID-basert).
- Spillkoden lastes før innlogging, men ingen persondata eller spillvisning.
