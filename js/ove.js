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
  start: document.getElementById("start"),
  okt: document.getElementById("okt"),
  teller: document.getElementById("teller"),
  sporsmal: document.getElementById("sporsmal"),
  handling: document.getElementById("handling"),
  resultat: document.getElementById("resultat"),
  fasittekst: document.getElementById("fasittekst"),
  detaljer: document.getElementById("detaljer"),
  panytt: document.getElementById("panytt"),
  feil: document.getElementById("feil"),
};

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
    lagRadio("modus", "flervalg", `Flervalg (${flervalg.length})`, flervalg.length === 0, true),
    lagRadio("modus", "langsvar", `Langsvar (${langsvar.length})`, langsvar.length === 0, flervalg.length === 0)
  );

  byggKapittelvalg(flervalg);

  el.modusvalg.addEventListener("change", () => {
    el.kapittelvalg.hidden = valgtModus() !== "flervalg";
  });
  el.kapittelvalg.hidden = valgtModus() !== "flervalg";

  el.start.addEventListener("click", startOkt);
  el.panytt.addEventListener("click", tilbakeTilOppsett);

  el.status.textContent = "Velg innhold, så trekkes spørsmålene i tilfeldig rekkefølge.";
  el.oppsett.hidden = false;
}

function byggKapittelvalg(flervalg) {
  const kapitler = [...new Set(flervalg.map((s) => s.kapittel))]
    .filter((k) => k !== undefined)
    .sort((a, b) => a - b);

  const valg = [
    lagLegend("Kapittel"),
    lagRadio("kapittel", "alle", `Alle kapitler, blandet (${flervalg.length})`, false, true),
  ];

  for (const nr of kapitler) {
    const antall = flervalg.filter((s) => s.kapittel === nr).length;
    valg.push(lagRadio("kapittel", String(nr), `${kapittelnavn(nr)} (${antall})`, false, false));
  }

  el.kapittelvalg.replaceChildren(...valg);
}

function kapittelnavn(nr) {
  const navn = data.kapitler?.[nr];
  return navn ? `${nr}. ${navn}` : `Kapittel ${nr}`;
}

/* ---------- Skjerm 2: økta ---------- */

function startOkt() {
  const modus = valgtModus();
  let utvalg = hentType(modus);

  if (modus === "flervalg") {
    const kapittel = valgtKapittel();
    if (kapittel !== "alle") {
      utvalg = utvalg.filter((s) => String(s.kapittel) === kapittel);
    }
  }

  okt = {
    modus,
    sporsmal: stokk(utvalg),
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

  visSporsmal();
}

function visSporsmal() {
  const s = okt.sporsmal[okt.indeks];
  okt.besvart = false;

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

  s.alternativer.forEach((tekst, i) => {
    const etikett = document.createElement("label");
    etikett.className = "alternativ";

    const knapp = document.createElement("input");
    knapp.type = "radio";
    knapp.name = "svar";
    knapp.value = String(i);

    etikett.append(knapp, document.createTextNode(" " + tekst));
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

  boks.append(tittel, felt);
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
    etikett.append(boks, document.createTextNode(" " + tekst));
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
    el.fasittekst.textContent =
      `${okt.momenterTruffet} av ${okt.momenterTotalt} momenter`;
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
  el.status.textContent = "Velg innhold, så trekkes spørsmålene i tilfeldig rekkefølge.";
}

/* ---------- Småting ---------- */

function hentType(type) {
  return (data.sporsmal ?? []).filter((s) => s.type === type);
}

function valgtModus() {
  return el.modusvalg.querySelector("input:checked")?.value;
}

function valgtKapittel() {
  return el.kapittelvalg.querySelector("input:checked")?.value ?? "alle";
}

function lagLegend(tekst, klasse) {
  const legend = document.createElement("legend");
  if (klasse) legend.className = klasse;
  legend.textContent = tekst;
  return legend;
}

function lagRadio(gruppe, verdi, tekst, deaktivert, valgt) {
  const etikett = document.createElement("label");
  const knapp = document.createElement("input");
  knapp.type = "radio";
  knapp.name = gruppe;
  knapp.value = verdi;
  knapp.disabled = deaktivert;
  knapp.checked = valgt && !deaktivert;

  if (deaktivert) etikett.className = "deaktivert";
  etikett.append(knapp, document.createTextNode(" " + tekst));
  return etikett;
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