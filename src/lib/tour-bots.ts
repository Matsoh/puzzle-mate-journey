// The tournament field: 71 club players with a face, a club and a fixed rating,
// split into three tiers. Pure data – the rules live in tour.ts.
import type { Tempo } from "./think-time";

export type Tier = "begynner" | "amator" | "proff";

export type TourBot = {
  id: string;
  name: string;
  elo: number;
  club: string;
  tier: Tier;
  /** Portrait under public/tour (200×200 PNG). */
  portrait: string;
  hue: number;
  style: string;
  line: string;
  winLine: string;
  tempo: Tempo;
};

// [portrait number, name, rating, club, style, line, win line]
type Row = [number, string, number, string, string, string, string];

const BEGYNNER: Row[] = [
  [80, "Selma Haug", 1210, "Sjakkhula", "Nybegynner med sprut", "Jeg har lært rokade i dag!", "Du var kjempeflink. Lærer du meg det trekket?"],
  [81, "Amara Lund", 1240, "Bondebrigaden", "Elsker å ta brikker", "Jeg tar alt jeg ser!", "Du så mer enn meg. Bra!"],
  [82, "Jonas Vik", 1270, "Springerne", "Springerfan", "Springeren min hopper over alt.", "Hoppet mitt var ikke nok i dag."],
  [99, "Ingrid Moe", 1300, "Tårnet SK", "Rolig og snill", "Jeg spiller bare trygt, jeg.", "Trygt var ikke nok. Gratulerer!"],
  [101, "Oskar Berge", 1330, "Sjakkhula", "Leser sjakkbøker", "Boka sier at dette er bra.", "Boka sa ingenting om deg."],
  [108, "Emil Strand", 1360, "Felt SK", "Prøver alltid skolematt", "Dronning ut tidlig – alltid!", "Skolematten funket ikke. Igjen."],
  [109, "Sander Eik", 1390, "Bondebrigaden", "Bondeflytter", "Bønder først, så ser vi.", "Du så lenger enn bøndene mine."],
  [110, "Theo Lie", 1420, "Nordlys Sjakk", "Rask og litt slurvete", "Fort, fort, fort!", "Jeg gikk for fort. Igjen. Bra spilt."],
  [113, "Live Nygård", 1440, "Hvit Løper SK", "Liker løpere", "Løperne mine ser hele brettet.", "Du så enda mer. Respekt."],
  [117, "Thea Dahl", 1250, "Felt SK", "Nysgjerrig nybegynner", "Hva skjer hvis jeg gjør sånn?", "Nå vet jeg hva som skjer. Du vinner."],
  [118, "Emma Solbakken", 1290, "Sjakkhula", "Sjakk i sjakk i sjakk", "Sjakk! Og sjakk igjen!", "Ingen sjakk var nok. Bra jobba."],
  [119, "Aksel Bråthen", 1350, "Kongefjell SK", "Modig angriper", "Jeg angriper med alt!", "Alt var ikke nok. Du var bedre."],
  [120, "Nora Fjeld", 1400, "Tårnet SK", "Ryddig og tålmodig", "Jeg venter på feilen din.", "Du gjorde ingen feil. Imponerende."],
  [134, "Tiril Aas", 1230, "Nordlys Sjakk", "Litt nervøs", "Oi, er det min tur?", "Jeg var nervøs. Du var rolig. Bra."],
  [141, "Mathias Holm", 1310, "Springerne", "Gaffel-jeger", "Gaffel! Jeg elsker gafler.", "Du gaflet meg. Hvordan?!"],
  [94, "Gerd Olsen", 1370, "Gaffelgjengen", "Bestemor med triks", "Jeg har spilt siden 1962, vet du.", "Ungdommen vinner. Bra, lille venn."],
  [95, "Arne Tangen", 1430, "Gaffelgjengen", "Bestefar som regner sakte", "Vent litt, jeg regner …", "Du regnet raskere enn meg. Flott."],
  [137, "Roar Bygg", 1340, "Bondebrigaden", "Bygger bondekjeder", "Bygg kjeden, så står den.", "Du rev ned hele byggverket mitt."],
  [143, "Kokken Kalle", 1280, "Felt SK", "Koker sammen angrep", "Dette blir en deilig rett.", "Au da. Du spiste opp hele menyen."],
  [142, "Klovnen Bobo", 1220, "Sirkus SK", "Uforutsigbar", "Honk honk! Overraskelse!", "Honk … du var ikke overrasket."],
  [146, "Gaute Glis", 1410, "Sirkus SK", "Smiler uansett", "Jeg smiler selv når jeg taper!", "Jeg smiler fortsatt. Bra spilt!"],
  [147, "Tore Tulling", 1200, "Sirkus SK", "Gjør rare trekk", "Hæ? Var det ulovlig?", "Jeg skjønte ingenting. Du vant."],
  [131, "Even Rød", 1450, "Kongefjell SK", "Blir rød i toppen", "Nå blir jeg varm i toppen!", "Du kjølte meg ned. Bra spilt."],
  [78, "Kjell Rask", 1380, "Nordlys Sjakk", "Slår ut i hurtigsjakk", "Jeg spiller på følelsen.", "Følelsen var feil i dag."],
];

const AMATOR: Row[] = [
  [77, "Hanna Lien", 1460, "Tårnet SK", "Solid klubbspiller", "Jeg gir ingenting gratis.", "Du tok det du trengte. Bra."],
  [84, "Marte Kvam", 1490, "Felt SK", "Liker åpne stillinger", "Åpne linjer – det er mitt.", "Linjene var dine i dag."],
  [85, "Sara Bakke", 1520, "Hvit Løper SK", "Løperpar-ekspert", "To løpere slår alt.", "Løperne mine fant ikke veien."],
  [86, "Bjørn Rønning", 1550, "Kongefjell SK", "Tung posisjonsspiller", "Jeg skviser deg sakte.", "Jeg ble skviset selv. Imponerende."],
  [87, "Ida Skar", 1580, "Nordlys Sjakk", "Taktisk og skarp", "Jeg ser kombinasjonene før deg.", "Du så dem først. Respekt."],
  [88, "Daniel Furu", 1610, "Sjakkhula", "Sicilianer", "Siciliansk. Alltid.", "Sicilianeren holdt ikke i dag."],
  [89, "Henrik Aune", 1640, "Springerne", "Springer-magiker", "Springerne mine danser.", "Dansen stoppet. Bra spilt."],
  [92, "Geir Flaten", 1670, "Gaffelgjengen", "Sluttspillsliper", "Jeg bytter av og vinner sluttspillet.", "Du vant sluttspillet. Mitt sluttspill!"],
  [93, "Maria Dale", 1700, "Tårnet SK", "Tårn på syvende rad", "Tårnet mitt skal til syvende.", "Du stengte syvende rad. Bra."],
  [96, "Amina Ness", 1730, "Felt SK", "Kongeangriper", "Kongen din er målet mitt.", "Kongen din var trygg hele veien."],
  [97, "Petter Lindstad", 1750, "Kongefjell SK", "Teoretiker", "Dette er teori til trekk 20.", "Du gikk ut av teorien og vant."],
  [98, "Anders Rud", 1470, "Bondebrigaden", "London-spiller", "London-systemet. Rolig og solid.", "London falt. Gratulerer."],
  [100, "Leila Haddad", 1500, "Nordlys Sjakk", "Finner alltid et motangrep", "Angrip, så angriper jeg tilbake.", "Motangrepet kom for sent."],
  [102, "Sofie Blå", 1530, "Sirkus SK", "Kreativ", "Jeg spiller det ingen venter.", "Du ventet det likevel. Bra."],
  [103, "Lars Hegg", 1560, "Hvit Løper SK", "Tålmodig forsvarer", "Du kommer ikke gjennom.", "Du kom gjennom. Hvordan?"],
  [105, "Kari Nes", 1590, "Sjakkhula", "Dronningbytter", "Bort med dronningene, så vinner jeg.", "Uten dronninger var du bedre."],
  [106, "Julie Mo", 1620, "Springerne", "Lynrask i tidsnød", "Tidsnød? Det er der jeg lever.", "Du holdt hodet kaldt. Respekt."],
  [107, "Vilde Sol", 1650, "Felt SK", "Profylakse-fan", "Jeg stopper planen din før du har den.", "Du hadde en plan jeg ikke så."],
  [112, "Frida Eng", 1680, "Tårnet SK", "Bondestormer", "Bøndene mine kommer!", "Stormen stilnet. Bra spilt."],
  [114, "Mats Haugen", 1710, "Kongefjell SK", "Kald regner", "Jeg regner. Du gjetter.", "Du regnet bedre enn meg i dag."],
  [115, "Noah Winter", 1740, "Nordlys Sjakk", "Iskald i sluttspill", "Sluttspillet er mitt.", "Du var iskald. Jeg smeltet."],
  [116, "Elise Berg", 1480, "Hvit Løper SK", "Offer-glad", "Jeg ofrer gjerne en kvalitet.", "Offeret var feil. Du tok det."],
  [133, "Jon Glitter", 1540, "Sirkus SK", "Spiller for publikum", "Dette blir et vakkert parti!", "Vakkert ble det. For deg."],
  [135, "Rita Rar", 1600, "Sirkus SK", "Rare åpninger", "1. h4! Ha ha!", "Rart ble det ikke nok."],
  [136, "Hettemannen", 1660, "Ukjent", "Mystisk", "…", "… bra spilt."],
  [138, "Odd Oddsen", 1690, "Gaffelgjengen", "Gammel rev", "Jeg har sett alt før.", "Det hadde jeg ikke sett før."],
  [139, "Penge-Per", 1570, "Bondebrigaden", "Grådig materialist", "Alt som er gratis, tar jeg.", "Det var ikke gratis. Dyr lærdom."],
  [140, "Gunnar Grinebiter", 1720, "Kongefjell SK", "Sur men sterk", "Mmpf. Bare spill.", "Mmpf. Greit. Du var best."],
];

const PROFF: Row[] = [
  [90, "Finn Bjørnstad", 1760, "Tårnet SK", "Klubbmester 1998", "Jeg har vunnet dette før.", "Ny tid, ny mester. Bra spilt."],
  [91, "Olav Fjellheim", 1790, "Kongefjell SK", "Veteran med stålnerver", "Rolig nå, unge venn.", "Du var roligere enn meg. Flott."],
  [104, "Kristian Wang", 1820, "Felt SK", "Åpningsnerd", "Dette har jeg forberedt hjemme.", "Forberedelsen holdt ikke mot deg."],
  [121, "Rikard Rik", 1850, "Sjakkhula", "Kjøper seg tid", "Tid er penger, og jeg har begge.", "Du var rik på gode trekk."],
  [122, "Agent Steen", 1880, "Ukjent", "Lekker aldri en plan", "Ingen kommentar.", "Ingen kommentar. Bra spilt."],
  [123, "Victor Sand", 1910, "Hvit Løper SK", "Selvsikker", "Jeg taper ikke mot barn.", "… jeg tapte mot et barn."],
  [124, "Gorm Hardhaus", 1940, "Bondebrigaden", "Knallhard", "Ingen nåde.", "Du viste heller ingen nåde."],
  [125, "Fredrik Bart", 1970, "Gaffelgjengen", "Filosof ved brettet", "Hva er egentlig et trekk?", "Det der var et trekk. Et godt et."],
  [126, "Professor Skjegg", 2000, "Nordlys Sjakk", "Dyp strateg", "Stillingen forteller meg alt.", "Stillingen løy for meg i dag."],
  [127, "René Tenker", 2020, "Felt SK", "Tenker, derfor vinner", "Jeg tenker, altså vinner jeg.", "Du tenkte bedre. Altså vant du."],
  [128, "Julius Keiser", 2050, "Kongefjell SK", "Hersker på brettet", "Jeg kom, jeg så, jeg vant.", "Du kom, du så, du vant."],
  [129, "Gamle Sokrates", 1980, "Tårnet SK", "Stiller spørsmål", "Vet du egentlig hva du gjør?", "Du visste det. Jeg visste ingenting."],
  [130, "Skurken Sly", 1890, "Sirkus SK", "Legger feller", "Mu-ha-ha! Gå i fella!", "Du gikk utenom alle fellene."],
  [132, "Ha-Ha-Hans", 1800, "Sirkus SK", "Ler av alt", "HA HA HA! Var det trekket ditt?", "Ha … ha. Ok. Du var god."],
  [144, "Grønne Grim", 1830, "Sirkus SK", "Monster i sluttspill", "GRRR. Sluttspillet er mitt!", "Grrr … du var sterkere."],
  [145, "Nils Nese", 1770, "Springerne", "Lukter kombinasjoner", "Jeg lukter en kombinasjon!", "Nesen min sviktet. Bra spilt."],
  [79, "Grete Glad", 1860, "Hvit Løper SK", "Smilende morder", "Smil, dette blir fort.", "Jeg smiler fortsatt. Du var best."],
  [83, "Ronja Rød", 1930, "Nordlys Sjakk", "Ild i angrepet", "Jeg setter brettet i brann.", "Du slukket brannen min."],
  [111, "Celine Vinter", 2030, "Sjakkhula", "Kald og presis", "Null feil. Det er planen.", "Én feil. Og du fant den."],
];

const TEMPOS: Tempo[] = ["impulsive", "steady", "slow"];
const build = (rows: Row[], tier: Tier): TourBot[] =>
  rows.map(([n, name, elo, club, style, line, winLine]) => ({
    id: `t${n}`, name, elo, club, tier, portrait: `/tour/${n}.png`, hue: (n * 47) % 360, style, line, winLine, tempo: TEMPOS[n % 3]!,
  }));

export const TOUR_BOTS: TourBot[] = [...build(BEGYNNER, "begynner"), ...build(AMATOR, "amator"), ...build(PROFF, "proff")];

export const tourBot = (id: string): TourBot | undefined => TOUR_BOTS.find((b) => b.id === id);
export const tierBots = (tier: Tier): TourBot[] => TOUR_BOTS.filter((b) => b.tier === tier);
