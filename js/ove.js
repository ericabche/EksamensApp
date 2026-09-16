/* Kjører én øvingsøkt for faget i ?fag=.
   Flervalg kan begrenses til ett kapittel eller blandes på tvers.
   Langsvar er en egen modus med selvretting mot momentlista. */

const fagId = new URLSearchParams(location.search).get("fag");

const el = {
  fagnavn: document.getElementById("fagnavn"),
  status: document.getElementById("status"),
  oppsett: document.getElementById("oppsett"),
  modusvalg: document.getElementById("modusvalg"),
  kapittelvalg: document.getElementById("kapittelvalg"),
  lengdevalg: document.getElementById("lengdevalg"),
  start: document.getElementById("start"),
  okt: document.getElementById("okt"),
  fremdrift: document.getElementById("fremdrift"),
  teller: document.getElementById("teller"),
  sporsmal: document.getElementById("sporsmal"),
  handling: document.getElementById("handling"),
  resultat: document.getElementById("resultat"),
  fasittekst: document.getElementById("fasittekst"),
  detaljer: document.getElementById("detaljer"),
  panytt: document.getElementById("panytt"),
  byttfag: document.getElementById("byttfag"),
  feil: document.getElementById("feil"),
};

const LEDETEKST = "Velg innhold, så trekkes spørsmålene i tilfeldig rekkefølge.";

let data = null;
let okt = null;

start();

async function start() {
  if (!fagId) {
    visFeil("Ingen fag er valgt. Gå tilbake til <a href='index.html'>faglista</a> og velg et fag.");
    return;
  }

  try {
    const svar = await fetch(`data/${fagId}.json`);
    if (!svar.ok) throw new Error(svar.status);
    data = await svar.json();
  } catch (e) {
    visFeil(
      `Fant ingen spørsmål for dette faget. Filen <code>data/${fagId}.json</code> ` +
      `mangler eller har en syntaksfeil. <a href="index.html">Tilbake til faglista</a>.`
    );
    return;
  }

  document.title = `${data.fag} – øving`;
  el.fagnavn.textContent = data.fag;
  byggOppsett();
}

/* ---------- Skjerm 1: oppsett ---------- */

function byggOppsett() {
  const flervalg = hentType("flervalg");
  const langsvar = hentType("langsvar");

  if (flervalg.length === 0 && langsvar.length === 0) {
    visFeil(`Filen <code>data/${fagId}.json</code> inneholder ingen spørsmål ennå.`);
    return;
  }

  el.modusvalg.replaceChildren(
    lagLegend("Hva vil du øve på?"),
    lagValgliste("fliser", [
      lagFlis("modus", "flervalg", "Flervalg", antallTekst(flervalg.length), flervalg.length === 0, true),
      lagFlis("modus", "langsvar", "Langsvar", antallTekst(langsvar.length), langsvar.length === 0, flervalg.length === 0),
    ])
  );

  byggKapittelvalg(flervalg);
  byggLengdevalg();

  el.modusvalg.addEventListener("change", oppdaterOppsett);
  el.kapittelvalg.addEventListener("change", oppdaterLengder);
  oppdaterOppsett();

  el.start.addEventListener("click", startOkt);
  el.panytt.addEventListener("click", tilbakeTilOppsett);
  el.byttfag.addEventListener("click", () => (location.href = "index.html"));

  el.status.textContent = LEDETEKST;
  el.oppsett.hidden = false;
}

function byggKapittelvalg(flervalg) {
  const kapitler = [...new Set(flervalg.map((s) => s.kapittel))]
    .filter((k) => k !== undefined)
    .sort((a, b) => a - b);

  const rader = [
    lagRad("kapittel", "alle", "Alle kapitler, blandet", antallTekst(flervalg.length), false, true),
  ];

  for (const nr of kapitler) {
    const antall = flervalg.filter((s) => s.kapittel === nr).length;
    rader.push(lagRad("kapittel", String(nr), kapittelnavn(nr), antallTekst(antall), false, false));
  }

  el.kapittelvalg.replaceChildren(
    lagLegend("Kapittel"),
    lagValgliste("rader", rader)
  );
}

function oppdaterOppsett() {
  el.kapittelvalg.hidden = valgtModus() !== "flervalg";
  oppdaterLengder();
}

/* Lengdene som er større enn utvalget slås av, så du aldri kan be om
   flere spørsmål enn det faktisk finnes. */
function byggLengdevalg() {
  el.lengdevalg.replaceChildren(
    lagLegend("Lengde"),
    lagValgliste("rader", [
      lagRad("lengde", "10", "Kort økt", "10 spørsmål", false, false),
      lagRad("lengde", "25", "Lang økt", "25 spørsmål", false, false),
      lagRad("lengde", "alle", "Alt i utvalget", "", false, true),
    ])
  );
}

function oppdaterLengder() {
  const tilgjengelig = hentUtvalg().length;
  const rader = [...el.lengdevalg.querySelectorAll(".rad")];

  for (const rad of rader) {
    const knapp = rad.querySelector("input");

    if (knapp.value === "alle") {
      rad.querySelector(".rad-antall").textContent = antallTekst(tilgjengelig);
      continue;
    }

    const forMange = Number(knapp.value) >= tilgjengelig;
    knapp.disabled = forMange;
    if (forMange && knapp.checked) {
      rader[rader.length - 1].querySelector("input").checked = true;
    }
  }
}

function kapittelnavn(nr) {
  const navn = data.kapitler?.[nr];
  return navn ? `${nr}. ${navn}` : `Kapittel ${nr}`;
}

function antallTekst(n) {
  return `${n} spørsmål`;
}

/* ---------- Skjerm 2: økta ---------- */

function hentUtvalg() {
  const modus = valgtModus();
  let utvalg = hentType(modus);

  if (modus === "flervalg") {
    const kapittel = valgtKapittel();
    if (kapittel !== "alle") {
      utvalg = utvalg.filter((s) => String(s.kapittel) === kapittel);
    }
  }

  return utvalg;
}

function startOkt() {
  const modus = valgtModus();
  const lengde = valgtLengde();

  /* Stokk først, klipp etterpå: da blir de ti spørsmålene et tilfeldig
     utvalg av hele kapittelet, ikke de ti første. */
  let utvalg = stokk(hentUtvalg());
  if (lengde !== "alle") utvalg = utvalg.slice(0, Number(lengde));

  okt = {
    modus,
    sporsmal: utvalg,
    indeks: 0,
    riktige: 0,
    momenterTruffet: 0,
    momenterTotalt: 0,
    besvart: false,
  };

  el.oppsett.hidden = true;
  el.resultat.hidden = true;
  el.okt.hidden = false;
  el.status.textContent = "";
  el.fremdrift.max = okt.sporsmal.length;

  visSporsmal();
}

function visSporsmal() {
  const s = okt.sporsmal[okt.indeks];
  okt.besvart = false;

  el.fremdrift.value = okt.indeks + 1;
  el.teller.textContent =
    `Spørsmål ${okt.indeks + 1} av ${okt.sporsmal.length}` +
    (s.kapittel !== undefined ? ` — ${kapittelnavn(s.kapittel)}` : "");

  el.sporsmal.replaceChildren(
    s.type === "flervalg" ? lagFlervalg(s) : lagLangsvar(s)
  );

  el.handling.textContent = s.type === "flervalg" ? "Sjekk svar" : "Vis momenter";
  el.handling.onclick = () => (okt.besvart ? neste() : rett(s));
}

function lagFlervalg(s) {
  const gruppe = document.createElement("fieldset");
  gruppe.className = "alternativer";
  gruppe.append(lagLegend(s.sporsmal, "sporsmalstekst"));

  if (s.kode) gruppe.append(lagKode(s.kode));

  s.alternativer.forEach((tekst, i) => {
    const etikett = document.createElement("label");
    etikett.className = "alternativ";

    const knapp = document.createElement("input");
    knapp.type = "radio";
    knapp.name = "svar";
    knapp.value = String(i);

    const merkelapp = document.createElement("span");
    merkelapp.textContent = tekst;

    etikett.append(knapp, merkelapp);
    gruppe.append(etikett);
  });

  return gruppe;
}

function lagLangsvar(s) {
  const boks = document.createElement("section");
  boks.className = "langsvar";

  const tittel = document.createElement("h2");
  tittel.className = "sporsmalstekst";
  tittel.textContent = s.sporsmal;

  const felt = document.createElement("textarea");
  felt.id = "svarfelt";
  felt.rows = 10;
  felt.placeholder = "Skriv svaret ditt her. Momentlista dukker opp når du er ferdig.";

  boks.append(tittel);
  if (s.kode) boks.append(lagKode(s.kode));
  boks.append(felt);
  return boks;
}

/* ---------- Retting ---------- */

function rett(s) {
  if (s.type === "flervalg" && !el.sporsmal.querySelector("input[name='svar']:checked")) {
    el.teller.textContent = "Velg et alternativ først.";
    return;
  }

  okt.besvart = true;
  s.type === "flervalg" ? rettFlervalg(s) : rettLangsvar(s);
  el.handling.textContent =
    okt.indeks + 1 < okt.sporsmal.length ? "Neste spørsmål" : "Se resultat";
}

function rettFlervalg(s) {
  const valgt = el.sporsmal.querySelector("input[name='svar']:checked");
  const etiketter = [...el.sporsmal.querySelectorAll(".alternativ")];

  etiketter.forEach((etikett, i) => {
    etikett.querySelector("input").disabled = true;
    if (i === s.fasit) etikett.classList.add("rett");
    if (valgt && Number(valgt.value) === i && i !== s.fasit) etikett.classList.add("feil");
  });

  if (valgt && Number(valgt.value) === s.fasit) okt.riktige++;

  if (s.forklaring) {
    const forklaring = document.createElement("p");
    forklaring.className = "forklaring";
    forklaring.textContent = s.forklaring;
    el.sporsmal.append(forklaring);
  }
}

function rettLangsvar(s) {
  const momenter = document.createElement("fieldset");
  momenter.className = "momenter";
  momenter.append(lagLegend("Kryss av det du fikk med"));

  (s.momenter ?? []).forEach((tekst, i) => {
    const etikett = document.createElement("label");

    const boks = document.createElement("input");
    boks.type = "checkbox";
    boks.value = String(i);

    const merkelapp = document.createElement("span");
    merkelapp.textContent = tekst;

    etikett.append(boks, merkelapp);
    momenter.append(etikett);
  });

  el.sporsmal.append(momenter);

  if (s.modellsvar) {
    const detaljer = document.createElement("details");
    const sammendrag = document.createElement("summary");
    sammendrag.textContent = "Modellsvar";
    const tekst = document.createElement("p");
    tekst.textContent = s.modellsvar;
    detaljer.append(sammendrag, tekst);
    el.sporsmal.append(detaljer);
  }
}

/* ---------- Videre og resultat ---------- */

function neste() {
  const s = okt.sporsmal[okt.indeks];

  if (s.type === "langsvar") {
    const bokser = [...el.sporsmal.querySelectorAll(".momenter input")];
    okt.momenterTotalt += bokser.length;
    okt.momenterTruffet += bokser.filter((b) => b.checked).length;
  }

  okt.indeks++;
  okt.indeks < okt.sporsmal.length ? visSporsmal() : visResultat();
}

function visResultat() {
  el.okt.hidden = true;
  el.resultat.hidden = false;

  if (okt.modus === "flervalg") {
    el.fasittekst.textContent = `${okt.riktige} av ${okt.sporsmal.length} riktige`;
    el.detaljer.textContent = lagKommentar(okt.riktige / okt.sporsmal.length);
  } else {
    el.fasittekst.textContent = `${okt.momenterTruffet} av ${okt.momenterTotalt} momenter`;
    el.detaljer.textContent =
      `Fordelt på ${okt.sporsmal.length} ${okt.sporsmal.length === 1 ? "oppgave" : "oppgaver"}. ` +
      "Momentene du lot stå igjen er de som er verdt å lese opp igjen.";
  }
}

function lagKommentar(andel) {
  if (andel === 1) return "Alt riktig. Ta et annet kapittel.";
  if (andel >= 0.7) return "Solid. Se på de du bommet på før du går videre.";
  return "Verdt en ny runde på dette kapittelet.";
}

function tilbakeTilOppsett() {
  el.resultat.hidden = true;
  el.oppsett.hidden = false;
  el.status.textContent = LEDETEKST;
}

/* ---------- Byggeklosser ---------- */

function hentType(type) {
  return (data.sporsmal ?? []).filter((s) => s.type === type);
}

function valgtModus() {
  return el.modusvalg.querySelector("input:checked")?.value;
}

function valgtKapittel() {
  return el.kapittelvalg.querySelector("input:checked")?.value ?? "alle";
}

function valgtLengde() {
  return el.lengdevalg.querySelector("input:checked")?.value ?? "alle";
}

function lagLegend(tekst, klasse) {
  const legend = document.createElement("legend");
  if (klasse) legend.className = klasse;
  legend.textContent = tekst;
  return legend;
}

function lagKode(kode) {
  const blokk = document.createElement("pre");
  const innhold = document.createElement("code");
  innhold.textContent = kode;
  blokk.append(innhold);
  return blokk;
}

function lagValgliste(klasse, valg) {
  const liste = document.createElement("ul");
  liste.className = klasse;

  for (const v of valg) {
    const rad = document.createElement("li");
    rad.append(v);
    liste.append(rad);
  }

  return liste;
}

function lagFlis(gruppe, verdi, navn, undertekst, deaktivert, valgt) {
  const etikett = document.createElement("label");
  etikett.className = "flis";

  const tittel = document.createElement("span");
  tittel.className = "flis-navn";
  tittel.textContent = navn;

  const antall = document.createElement("span");
  antall.className = "flis-antall";
  antall.textContent = undertekst;

  etikett.append(lagKnapp(gruppe, verdi, deaktivert, valgt), tittel, antall);
  return etikett;
}

function lagRad(gruppe, verdi, navn, undertekst, deaktivert, valgt) {
  const etikett = document.createElement("label");
  etikett.className = "rad";

  const tittel = document.createElement("span");
  tittel.textContent = navn;

  const antall = document.createElement("span");
  antall.className = "rad-antall";
  antall.textContent = undertekst;

  etikett.append(lagKnapp(gruppe, verdi, deaktivert, valgt), tittel, antall);
  return etikett;
}

function lagKnapp(gruppe, verdi, deaktivert, valgt) {
  const knapp = document.createElement("input");
  knapp.type = "radio";
  knapp.name = gruppe;
  knapp.value = verdi;
  knapp.disabled = deaktivert;
  knapp.checked = valgt && !deaktivert;
  return knapp;
}

/* Fisher-Yates */
function stokk(liste) {
  const kopi = [...liste];
  for (let i = kopi.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopi[i], kopi[j]] = [kopi[j], kopi[i]];
  }
  return kopi;
}

function visFeil(melding) {
  el.feil.innerHTML = melding;
  el.feil.hidden = false;
}