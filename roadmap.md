# Premium UI redesign
- [x] Apply shared modern tokens, typography and navigation on every route.
- [x] Redesign overview, coach portraits, ladder, free play and progress.
- [x] Refine puzzle, game, result and review presentation without changing logic.
- [x] Verify all routes, controls and existing tests without altering saved progress; do not publish.

# Goblin visual update
- [x] Rename coach and replace avatar with goblin knight.
- [x] Build shared procedural stone knight, textures and mossy scene elements.
- [x] Update home, boss intro and victory with forest lighting and rear-up animation.
- [x] Apply goblin theme and regenerate install icons; refresh PWA cache.
- [x] Verify desktop/mobile scenes and existing chess flows.

# Daily coach additions
- [x] Add optional portrait with SVG fallback to shared coach avatar.
- [x] Add deterministic context-aware daily peptalk and next goal.
- [x] Add daily rotation of the ten approved chess facts.
- [x] Test daily rules and verify portrait fallback and mobile/desktop home.

# Animated champion scene
- [x] Add reusable image-based avatar scene with tilt, particles and replayable celebration.
- [x] Replace home and win scenes; update round portrait and offline cache.
- [x] Verify real missing-image fallback and replay; verify desktop/mobile image layout.
- [x] Connect the uploaded PNG background and transparent avatar; verify the actual home scene on desktop and mobile.
# Virtuell trener (fase 1)
- [x] /trener med Magnus-/Hikaru-inspirert profil, lagret valg, råd, øvelser og kilder.
- [x] Dagens økt på oversikten med pusler, øvelse, refleksjon og kort økt; XP én gang.
- [x] Verifiser øvelser med chess.js, tester og preview mobil/desktop.

# Mål-tekst og avatar-etikett
- [x] Fjern beregnet "X ratingpoeng til målet på 2000" på hjem og erstatt med "Målet ditt: 2000 i klubb/FIDE" + kort forklaring.
- [x] Samme rammeverk på Fremgang: målkort og graflinje merket "2000" i stedet for "MÅL 2000"; peptalkens neste-mål ikke lenger poengregning.
- [x] Sidebar: "Din trener" → "Din avatar".
- [x] Tester og preview verifisert desktop/mobil; lagret fremgang urørt, ikke publisert.

# Adaptiv trener (fase 2)
- [x] 72 Lichess-oppgaver (CC0) i 8 temaer × 3 nivåer, validert med chess.js; intro-oppgaver som gjensyn.
- [x] Ferdighetsmodell per trener+tema, nivåvalg, nivåtest, repetisjon, ærlig utbrukt-melding.
- [x] Dagens økt bruker samme motor, fast per dato/profil; lagring v2 med migrering; ingen XP for oppgaver.
- [x] Tester + nettlesersjekk (mobil/desktop).

# Browser QA: DOM nesting fix
- [x] Wrap the daily-session label in a div and make the coach/player avatar root an inline-flex span.
- [x] Reproduce the old warning, then verify no nesting or hydration errors on any route, desktop and mobile.

## Turneringsforberedelse (okt 2026)
- [ ] Bygg om /turnering til forberedelse: åpningsplan, åpningsdrill, taktikk, sluttspill, treningsparti med trenerhjelp
- [ ] Bruk offentlige Lichess-filer (raw, ingen konto/connector); Listudy kun inspirasjon; enkel tekst

- [x] Bot never moved in clocked games (clock tick restarted bot turn); engine timeout/restart + Prøv igjen; clock frozen on engine error

# Spillforside og Mike (steg 1)
- [x] Ny forside: Mike med replikk, stor XP-stolpe med nivåtittel, «Spill mot …»-knapp, dagens tre oppdrag (5 oppgaver, spill ett parti, vinn ett parti) med +40 XP bonus én gang per dag.
- [x] Navigasjon ned til Hjem/Spill/Oppgaver/Fremgang + «Mer» (fritt parti, treningsparti, trener, turnering, innstillinger); forklaringstekster fjernet.
- [x] Mike tegnet som SVG fra filtfiguren (chill/happy/think/shock/sleep); engelske, tørre replikker i src/lib/mike.ts som senere kan byttes mot en lokal LLM.
- [x] Dev-modus uten innlogging (VITE_LOCAL_DEV=1, kun `vite dev`); tester for oppdrag, nivåtitler og Mike.

# Monsterboken, kiste, verksted og Mike-chat (steg 2)
- [x] Monsterboken (/samling): 36 taktiske motiver i fire sjeldenheter låses opp fra løste oppgaver; beseirede motstandere. Feiring når nytt motiv finnes.
- [x] Feiring: fullskjerm ved nytt nivå (tittel + Mike), nye merker, kiste. Konfetti og lyd.
- [x] Skattekisten: alle tre oppdrag → én kiste per dag med variabel belønning (70/25/5 %, streak øker oddsen). Mynter i Progress.
- [x] Monsterverkstedet (/avatar): egen filt-monster-avatar i seks deler, gratis grunndeler, resten kjøpes for mynter. Avataren vises overalt.
- [x] Snakk med Mike (/mike): systemprompt, kontekst med ekte tall, Ollama lokalt med innebygd reserve. Innstillinger for adresse/modell. README-oppsett.
- [x] Nav: Samling erstatter Fremgang i hovedmenyen; Mike, verksted og Fremgang under Mer.

# Mike ved brettet (steg 3)
- [x] MikeCompanion: Mike med live-replikk + «Spør Mike»-minichat med sidens kontekst, i parti, treningsparti, turneringsdag og trenersiden.
- [x] Regler per modus: i parti aldri trekkhint (bare vaner og ro); i treningsparti hint tillatt; etter parti kommenterer Mike motorens fakta; turneringsdag = ringside-coach.
- [x] Deterministiske reaksjoner uten nett (slag, sjakk, materiell, klokke, milepæler) og introreplikk per motstander. Tester.

# Forberedelse (forenklet turnering)
- [x] «På turneringsdagen» og turneringsoppsett (navn, dato, runder, tidskontroll) fjernet. Siden heter Forberedelse: Mike + åpninger (trykkbare kort, én hvit + én/to svart) + kjapp økt + taktikk/sluttspill + treningsparti.

# Mine partier og Mikes notatbok
- [x] /partier: hent ekte partier fra chess.com og Lichess (offentlige API-er, kun brukernavn), liste, Stockfish-analyse, Mike-gjennomgang + trenerens gjennomgang. +25 XP per parti første gang; teller som dagens parti-oppdrag.
- [x] Mikes notatbok: motorfakta → lærdommer (hengende brikker, tillot/oversett matt, åpning, sluttspill, taktikk). Mønstre telles over tid, vises på /partier og gis Mike som kontekst; Mike nevner det på forsiden annenhver dag.
