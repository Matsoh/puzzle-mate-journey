/** Curated opening lines. Move orders checked against lichess-org/chess-openings (CC0); eco/name = longest matching entry there. */
export type Side = "white" | "black";
export type Group = "white" | "e4" | "d4";
export type Branch = {
  id: string;
  name: string;
  eco: string;
  lichessName: string;
  moves: string[];
  reply: string;
};
export type Why = { q: string; options: string[]; correct: number; explain: string };
export type Opening = {
  id: string;
  name: string;
  side: Side;
  group: Group;
  summary: string;
  plans: string[];
  idea: string;
  branches: Branch[];
  why: Why;
};

export const GROUP_LABEL: Record<Group, string> = {
  white: "Med hvit",
  e4: "Med svart mot 1.e4",
  d4: "Med svart mot 1.d4",
};

const s = (pgn: string) => pgn.split(" ").filter((t) => !/^\d+\.$/.test(t));

export const OPENINGS: Opening[] = [
  {
    id: "italiensk",
    name: "Italiensk",
    side: "white",
    group: "white",
    summary: "Løperen går til c4 og sikter mot f7.",
    idea: "Utvikle springere og løpere, rokér, og ta midten.",
    plans: [
      "Ta midten med e4.",
      "Løperen på c4 presser f7.",
      "Spill c3 og d3 eller d4. Rokér tidlig.",
    ],
    branches: [
      {
        id: "giuoco",
        name: "Rolig italiensk",
        eco: "C54",
        lichessName: "Italian Game: Classical Variation, Giuoco Pianissimo",
        reply: "Svart setter løperen på c5.",
        moves: s("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O"),
      },
      {
        id: "tospringer",
        name: "Tospringerspill",
        eco: "C55",
        lichessName: "Italian Game: Two Knights Defense, Modern Bishop's Opening",
        reply: "Svart spiller springeren til f6.",
        moves: s("1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Be7 5. O-O O-O 6. Re1 d6"),
      },
    ],
    why: {
      q: "Hvorfor går løperen til c4?",
      options: [
        "Den sikter mot f7, et svakt felt.",
        "Den skal fange dronningen.",
        "Den beskytter kongen på e1.",
      ],
      correct: 0,
      explain: "f7 er bare dekket av kongen i starten. Løperen på c4 legger press der.",
    },
  },
  {
    id: "skotsk",
    name: "Skotsk",
    side: "white",
    group: "white",
    summary: "Hvit åpner midten tidlig med d4.",
    idea: "Åpne midten med d4, og ta tilbake med springeren.",
    plans: [
      "Spill d4 før svart er klar.",
      "Springeren på d4 står sentralt.",
      "Utvikle raskt og rokér.",
    ],
    branches: [
      {
        id: "springer",
        name: "Med Nf6",
        eco: "C45",
        lichessName: "Scotch Game: Mieses Variation",
        reply: "Svart angriper e4 med springeren.",
        moves: s("1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Nf6 5. Nxc6 bxc6 6. e5 Qe7 7. Qe2 Nd5"),
      },
      {
        id: "klassisk",
        name: "Med Bc5",
        eco: "C45",
        lichessName: "Scotch Game: Classical Variation",
        reply: "Svart angriper springeren på d4 med løperen.",
        moves: s("1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Bc5 5. Be3 Qf6 6. c3 Nge7 7. Bc4"),
      },
    ],
    why: {
      q: "Hvorfor spiller hvit d4 allerede i trekk 3?",
      options: [
        "For å åpne midten og få fri plass til brikkene.",
        "For å bytte dronninger.",
        "For å gi bort en bonde.",
      ],
      correct: 0,
      explain: "Etter d4 og Nxd4 får hvit en sterk springer i midten og åpne linjer.",
    },
  },
  {
    id: "spansk",
    name: "Spansk",
    side: "white",
    group: "white",
    summary: "Løperen til b5 presser springeren på c6.",
    idea: "Press springeren som forsvarer e5. Rokér og bygg midten med c3 og d4.",
    plans: ["Bb5 legger press på c6.", "Rokér tidlig, så Re1.", "Spill c3 og d4 senere."],
    branches: [
      {
        id: "morphy",
        name: "Med 3...a6",
        eco: "C88",
        lichessName: "Ruy Lopez: Closed",
        reply: "Svart spør løperen med a6.",
        moves: s("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3"),
      },
      {
        id: "berlin",
        name: "Berlinerforsvar",
        eco: "C67",
        lichessName: "Ruy Lopez: Berlin Defense, l'Hermet Variation",
        reply: "Svart slår e4 med springeren.",
        moves: s("1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5"),
      },
    ],
    why: {
      q: "Hvorfor angriper løperen springeren på c6?",
      options: ["Springeren forsvarer bonden på e5.", "Løperen vil til h8.", "Det gir sjakk."],
      correct: 0,
      explain: "Hvis springeren forsvinner, står e5 svakere. Det er presset i spansk.",
    },
  },
  {
    id: "london",
    name: "London",
    side: "white",
    group: "white",
    summary: "Et fast oppsett med d4 og løper til f4.",
    idea: "Spill d4, Bf4, e3, Nf3 og c3. Samme oppsett nesten hver gang.",
    plans: [
      "Løperen ut til f4 før e3.",
      "Bygg med e3, c3 og Nbd2.",
      "Rokér og se etter e4 senere.",
    ],
    branches: [
      {
        id: "d5",
        name: "Mot 1...d5",
        eco: "D00",
        lichessName: "Queen's Pawn Game: Accelerated London System",
        reply: "Svart svarer med d5 og c5.",
        moves: s("1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3 c5 5. c3 Nc6 6. Nbd2 Bd6 7. Bg3"),
      },
      {
        id: "g6",
        name: "Mot kongeindisk oppsett",
        eco: "A45",
        lichessName: "Indian Defense: Accelerated London System",
        reply: "Svart fianchetterer løperen på g7.",
        moves: s("1. d4 Nf6 2. Bf4 g6 3. e3 Bg7 4. Nf3 O-O 5. Be2 d6 6. h3"),
      },
    ],
    why: {
      q: "Hvorfor kommer løperen til f4 før e3?",
      options: ["Etter e3 blir den stengt inne.", "Den skal slå på h6.", "Det er bare tilfeldig."],
      correct: 0,
      explain: "Bonden på e3 stenger løperens vei. Derfor går løperen ut først.",
    },
  },
  {
    id: "carokann",
    name: "Caro-Kann",
    side: "black",
    group: "e4",
    summary: "Svart støtter d5 med c6. Solid og trygg.",
    idea: "Spill c6 og d5. Få løperen ut før e6.",
    plans: [
      "c6 og d5 utfordrer midten.",
      "Løperen til f5 før e6.",
      "Solid bondestruktur, rolig utvikling.",
    ],
    branches: [
      {
        id: "klassisk",
        name: "Klassisk",
        eco: "B15",
        lichessName: "Caro-Kann Defense",
        reply: "Hvit spiller Nc3, og svart slår på e4.",
        moves: s("1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7"),
      },
      {
        id: "fremstoet",
        name: "Fremstøtsvarianten",
        eco: "B12",
        lichessName: "Caro-Kann Defense: Advance Variation, Short Variation",
        reply: "Hvit skyver e5.",
        moves: s("1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 c5 6. O-O Nc6"),
      },
    ],
    why: {
      q: "Hvorfor kommer løperen til f5 før e6?",
      options: [
        "Etter e6 blir den stengt inne bak bøndene.",
        "Den skal angripe h1.",
        "For å gi sjakk.",
      ],
      correct: 0,
      explain: "Løperen på c8 trenger å komme ut før e6, ellers blir den passiv.",
    },
  },
  {
    id: "fransk",
    name: "Fransk",
    side: "black",
    group: "e4",
    summary: "Svart spiller e6 og d5 og angriper midten senere med c5.",
    idea: "Spill e6 og d5. Angrip hvits bondekjede med c5.",
    plans: ["e6 og d5 mot e4.", "Mot e5: angrip med c5.", "Press på d4 med Nc6 og Qb6."],
    branches: [
      {
        id: "fremstoet",
        name: "Fremstøtsvarianten",
        eco: "C02",
        lichessName: "French Defense: Advance Variation, Main Line",
        reply: "Hvit skyver e5.",
        moves: s("1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. a3 c4"),
      },
      {
        id: "klassisk",
        name: "Klassisk",
        eco: "C11",
        lichessName: "French Defense: Steinitz Variation, Boleslavsky Variation",
        reply: "Hvit spiller Nc3.",
        moves: s("1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. e5 Nfd7 5. f4 c5 6. Nf3 Nc6 7. Be3"),
      },
      {
        id: "avbytte",
        name: "Avbyttevarianten",
        eco: "C01",
        lichessName: "French Defense: Exchange Variation",
        reply: "Hvit slår på d5.",
        moves: s("1. e4 e6 2. d4 d5 3. exd5 exd5 4. Nf3 Nf6 5. Bd3 Bd6"),
      },
    ],
    why: {
      q: "Hvorfor spiller svart ofte c5 i fransk?",
      options: [
        "Det angriper hvits bondekjede ved d4.",
        "For å flytte kongen.",
        "For å fange løperen på c1.",
      ],
      correct: 0,
      explain: "Bondekjeden e5–d4 angripes fra basen. c5 presser d4.",
    },
  },
  {
    id: "siciliansk",
    name: "Siciliansk",
    side: "black",
    group: "e4",
    summary: "Svart svarer med c5 og kjemper om d4.",
    idea: "Kjemp om d4 med c5. Svart får ofte spill på dronningfløyen.",
    plans: [
      "c5 kontrollerer d4.",
      "Bytt c-bonden mot hvits d-bonde.",
      "Spill på c-linjen og dronningfløyen.",
    ],
    branches: [
      {
        id: "aapen",
        name: "Åpen siciliansk",
        eco: "B92",
        lichessName: "Sicilian Defense: Najdorf Variation, Opocensky Variation",
        reply: "Hvit åpner med d4.",
        moves: s("1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5"),
      },
      {
        id: "lukket",
        name: "Lukket siciliansk",
        eco: "B25",
        lichessName: "Sicilian Defense: Closed",
        reply: "Hvit spiller Nc3 og g3.",
        moves: s("1. e4 c5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. d3 d6"),
      },
      {
        id: "alapin",
        name: "Alapin (2.c3)",
        eco: "B22",
        lichessName: "Sicilian Defense: Alapin Variation, Smith-Morra Declined",
        reply: "Hvit spiller c3.",
        moves: s("1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. Nf3 Nc6"),
      },
    ],
    why: {
      q: "Hva er hovedideen med 1...c5?",
      options: [
        "Kontrollere d4 uten å spille e5.",
        "Åpne for dronningen mot h4.",
        "Forberede lang rokade straks.",
      ],
      correct: 0,
      explain: "c5 kjemper om d4-feltet. Stillingen blir ubalansert.",
    },
  },
  {
    id: "qgd",
    name: "Avslått dronninggambit",
    side: "black",
    group: "d4",
    summary: "Svart holder d5 med e6. Klassisk og solid.",
    idea: "Hold d5 med e6. Utvikle, rokér, og frigjør senere med c5 eller e5.",
    plans: ["e6 støtter d5.", "Be7, rokade og Nbd7.", "Frigjør stillingen med c5 eller e5."],
    branches: [
      {
        id: "bg5",
        name: "Mot Bg5",
        eco: "D53",
        lichessName: "Queen's Gambit Declined",
        reply: "Hvit binder springeren med Bg5.",
        moves: s("1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7"),
      },
      {
        id: "bf4",
        name: "Mot Bf4",
        eco: "D30",
        lichessName: "Queen's Gambit Declined",
        reply: "Hvit setter løperen på f4.",
        moves: s("1. d4 d5 2. c4 e6 3. Nf3 Nf6 4. Nc3 Be7 5. Bf4 O-O 6. e3 c5"),
      },
    ],
    why: {
      q: "Hvorfor spiller svart e6 her?",
      options: [
        "For å støtte bonden på d5.",
        "For å angripe c4 med dronningen.",
        "For å lage plass til kongen på e7.",
      ],
      correct: 0,
      explain: "Hvit angriper d5 med c4. e6 holder d5 fast.",
    },
  },
  {
    id: "slavisk",
    name: "Slavisk",
    side: "black",
    group: "d4",
    summary: "Svart støtter d5 med c6, så løperen kan komme ut.",
    idea: "Hold d5 med c6. Løperen på c8 kommer ut til f5.",
    plans: ["c6 støtter d5.", "Løperen til f5 eller g4.", "Så e6 og rolig utvikling."],
    branches: [
      {
        id: "hoved",
        name: "Hovedvarianten",
        eco: "D18",
        lichessName: "Slav Defense: Czech Variation, Classical System",
        reply: "Hvit spiller Nf3 og Nc3, og svart slår på c4.",
        moves: s("1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 dxc4 5. a4 Bf5 6. e3 e6 7. Bxc4 Bb4"),
      },
      {
        id: "avbytte",
        name: "Avbyttevarianten",
        eco: "D10",
        lichessName: "Slav Defense: Exchange Variation",
        reply: "Hvit slår på d5.",
        moves: s("1. d4 d5 2. c4 c6 3. cxd5 cxd5 4. Nc3 Nf6 5. Bf4 Nc6 6. e3 Bf5"),
      },
    ],
    why: {
      q: "Hva er fordelen med c6 i stedet for e6?",
      options: [
        "Løperen på c8 blir ikke stengt inne.",
        "Kongen får rokere raskere.",
        "Dronningen kan gå til a5 med matt.",
      ],
      correct: 0,
      explain: "Med c6 er veien for løperen på c8 åpen.",
    },
  },
  {
    id: "kongeindisk",
    name: "Kongeindisk",
    side: "black",
    group: "d4",
    summary: "Svart lar hvit ta midten, og angriper den senere.",
    idea: "Fianchetter løperen på g7, rokér, og slå tilbake med e5 eller c5.",
    plans: ["Nf6, g6 og Bg7.", "Rokér tidlig.", "Angrip midten med e5."],
    branches: [
      {
        id: "klassisk",
        name: "Klassisk",
        eco: "E97",
        lichessName: "King's Indian Defense: Orthodox Variation, Aronin-Taimanov Defense",
        reply: "Hvit bygger stor midte med c4 og e4.",
        moves: s("1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6"),
      },
      {
        id: "fianchetto",
        name: "Fianchetto",
        eco: "A49",
        lichessName: "Indian Defense: Przepiorka Variation",
        reply: "Hvit setter også løperen på g2.",
        moves: s("1. d4 Nf6 2. Nf3 g6 3. g3 Bg7 4. Bg2 O-O 5. O-O d6 6. c4 Nbd7"),
      },
    ],
    why: {
      q: "Hvorfor spiller svart e5 etter rokaden?",
      options: [
        "For å angripe hvits midte.",
        "For å åpne for hvit dronning.",
        "For å flytte kongen tilbake.",
      ],
      correct: 0,
      explain: "Svart lar hvit ta midten først, og angriper den så med e5.",
    },
  },
];

export const getOpening = (id: string) => OPENINGS.find((o) => o.id === id);
