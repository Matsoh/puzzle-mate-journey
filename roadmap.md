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

# Ekte motstandere (Maia 3)
- [x] Maia 3 (human-like nevralt nett, ONNX 44 MB, caches i IndexedDB) velger botenes trekk i stigen, fritt parti og treningsparti, betinget på botens og Tobias' rating. Stockfish tar over i sluttspill (≤ 8 brikker) og som reserve.
- [x] Menneskelig tidsbruk for svake boter: lange pauser på opplagte trekk, blitzing i vanskelige stillinger, tidsnød-spiral.
- [x] Nedlastingsknapp på stigen/i parti; egen worker (public/maia-worker.js) + vendored onnxruntime-web (MIT). Koding testet; e2e i Chromium.

# Mike er treneren (feedback fra Tobias)
- [x] Magnus/Hikaru fjernet. Én trener: Mike, med alle 8 temaer (72 oppgaver), alle grunnøvelser og samlede råd. Gammel treningshistorikk flettes inn (trainer v3).
- [x] Mikes personlighet skrevet om: ører (ikke horn!), sydd av Tobias, hans egen, elsker sjakk, vil se Tobias nå 2000 og vil at han spiller her. Trenerprinsipper i prompten (sjakk/slag/trusler, kandidattrekk, dårligste brikke, sluttspillregler). Mikes ansikt følger det han sier.
- [x] Bondebytte i parti: velg brikke (som chess.com), aldri automatisk dronning.

# Avatar (Snapchat-stil) og opplåsing
- [x] Egen fane «Avatar»: Avataaars-figur (Pablo Stanley, gratis) rendret lokalt med DiceBear (MIT, vendored i src/vendor/dicebear). 128 deler i 11 kategorier.
- [x] Opplåsing ved å spille: gratis grunndeler, mynter fra kisten, nivå, dager på rad, slåtte motstandere, motiver, seire, partier. «Neste du kan låse opp» som mål.
- [x] Avatarnavn kan endres (vises i meny og Mer). Monsterboken ligger under Avatar og i Mer. Mikes monster-avatar fjernet fra spillerens profil.

## Steg 13 – Partianalyse som chess.com
- `reviewGame` i src/lib/coach.ts: hvert trekk (begge sider) klassifiseres – briljant/flott/best/utmerket/bra/teori/unøyaktig/feil/bom/tabbe – etter tap i vinnsjanse mot motorens beste trekk. Nøyaktighet per side (Lichess-formel), telling per klasse, og de 3 viktigste feilene (samme `Mistake[]` som før, så CoachDebrief/notatboken er uendret).
- Teori = trekkrekken er et prefiks av en linje i src/data/openings.ts (første 16 halvtrekk).
- `Board` har fått `badges` (via react-chessboard `squareRenderer`); `GameReview.tsx` viser evalbar, merke på brettet, grønn pil til beste trekk ved feil, trekkliste med merker, bla-knapper og tabell.
- Brukes i parti, treningsparti og Mine partier (importerte partier).

## Steg 14 – Mike Skolen
- «Treningsparti» og «Trening med Mike» er slått sammen til én side: **Mike Skolen** (/trener). /treningsparti finnes fortsatt som selve partiet, men er ute av menyen.
- Dagens timeplan (src/lib/school.ts): tre leksjoner om dagen – adaptiv oppgave, treningsparti (≥10 halvtrekk) og grunnoppgave – +15 XP hver, +40 XP bonus når alle tre er gjort samme dag. Betales én gang per dag via `credits` (`school:<dag>:<leksjon>`), og teller skoledager.
- Treningsparti startes fra skolen i tre nivåer (Lett/Jevn/Tøff = rating −150/0/+150).
- Monsterboken forklart: intro-kort øverst på /samling («Pokédex for sjakk»), tydeligere hint i menyen og på avatar-siden.

## Steg 15 – Avatar via profilbildet
- «Avatar» er fjernet fra hovedmenyen (4 valg: Hjem, Spill, Oppgaver, Mer). Profilbildet i toppfeltet (mobil), i sidemenyen (desktop), på Hjem og på Mer-siden åpner /avatar.

## Steg 16 – Spill mot venner (runde 1)
- Database (supabase/migrations/20261025120000_online_play.sql): `profiles` (navn, vennekode, avatar, rating, nivå, streak), `friendships`, `challenges`, `live_games`, `game_chat`. Alt bak RLS + `is_approved_player()`. Spill kun mellom venner (`are_friends`). RPC-er: ensure_profile, send_friend_request, respond_friend_request, create_challenge, answer_challenge, play_move (server styrer tur, rekkefølge og klokker), game_action (gi opp, remis, tidsklage, avbryt). Realtime på live_games/game_chat/challenges/friendships.
- Klient: src/lib/online.ts (API + rene hjelpere, testet), src/lib/online-store.ts (venner/utfordringer/pålogget), OnlineHub.tsx (profilspeil, innboks, presence, utfordringspopup, «parti pågår»-banner), /venner (vennekode, legg til, utfordre med tid og farge), /live/$gameId (brett, klokker, remis/gi opp, chat, Mike ved brettet, resultat → rating/XP én gang, analyse med merker, revansj).
- Migrasjonen må kjøres i Lovable (Supabase) – ikke automatisk fra GitHub. types.ts er håndredigert; Lovable regenererer den.

## Steg 17 – Premoves (uendelig kø)
- src/lib/premove.ts (rene regler, testet) + src/components/usePremoves.ts (kø-hook). `Board` tar `premove={queue,onAdd,onClear}`: når det ikke er spillerens tur kan egne brikker (og brikker som allerede ligger i køen) dras; trekkene legges i kø og feltene markeres med `--board-premove`. Første trekk i køen utføres automatisk når det blir hans tur; ulovlig trekk tømmer køen; høyreklikk/trykk på tomt felt tømmer. Forvandling i premove blir dronning.
- Aktivt i parti (bots/stigen), treningsparti og live-partier mot venner.

## Steg 18 – Skoleuka med premie
- Øverst på Mike Skolen: Man–Søn-stripe (`weekStatus` i school.ts) med hake per fullført skoledag og dagens dag markert. Feiring «Skoledag fullført!» når alle tre leksjoner er gjort.
- Full uke (7/7 skoledager, mandag–søndag) gir premie én gang per uke (`school:week:<mandag>`): +100 mynter, +100 XP og feiring. Nye avatar-deler med lås «Full skoleuke» / «N fulle skoleuker» (Unlock kind `weeks` i avatar.ts: Afro med bånd, Resist-trykk, Trist munn ved 1 uke; Dreads deluxe og Skråbryn ved 2; Halvlangt hår ved 3).

## Steg 19 – Partiarkiv som chess.com
- Alle partier i appen lagres nå i samme arkiv som importerte partier (`Progress.importedGames`, Source utvidet med `app` og `venn`, tak 80): bot-partier (parti.tsx), treningspartier (treningsparti.tsx, ikke avbrutte) og venne-partier (live.$gameId.tsx) via `withAppGame` i src/lib/game-log.ts.
- `GameRow` (resultatmerke W/½/L, `MiniBoard` med sluttstilling, motstander/rating, farge, kilde, tid, trekk, «x siden») brukes på Hjem («Siste partier», tre nyeste, lenke «Alle partier») og på /partier med filter Alle / Venner / Bots / chess.com-Lichess. Trykk åpner samme analyse (reviewGame + GameReview + Mike + notatbok, +25 XP første gang). /partier?open=<id> dyplenker til et parti.

## Steg 20 – Levende bot-avatarer
- Nye navn og portretter (public/bots/1–10.png): Neil Down, Bill Board, Chris P. Bacon, Ida Know, Hugh Jass, Jack Pott, Phil Landers, Heidi Claire, Robin Banks, ET. Ids (pelle, kaos …) er beholdt så `beaten` og avatar-låser virker.
- src/lib/bot-mood.ts (rent, testet): humør fra stillingen og siste trekk sett fra boten – idle/think/happy/smug/angry/worried/sad/win/lose/draw – og replikker med personlighet. `BotAvatar` animerer portrettet med CSS (puster, svaier når den tenker, hopper ved slag, rister med rød glød når den mister brikker, henger med hodet og blir grå når den taper, hopper med gull-glød når den vinner), humør-emoji og snakkeboble ved humørskifte.
- Partiet: toppfelt med stort portrett, navn litt mindre, rating/stil, klokke; eget felt med Tobias sin avatar nederst. Intro-skjermen viser portrettet i stedet for 3D-scenen. Stigen og Monsterboken bruker portrettene.
