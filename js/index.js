/* Bygger faglisten på forsiden ut fra data/fag.json,
   og teller spørsmål ved å lese hvert fags egen datafil. */

const liste = document.getElementById("fagliste");
const status = document.getElementById("status");
const feil = document.getElementById("feil");

start();

async function start() {
  try {
    const svar = await fetch("data/fag.json");
    if (!svar.ok) throw new Error(svar.status);

    const fag = await svar.json();
    const medAntall = await Promise.all(fag.map(tellSporsmal));

    liste.replaceChildren(...medAntall.map(lagRad));
    status.textContent = lagStatustekst(medAntall);
  } catch (e) {
    status.textContent = "";
    visFeil();
  }
}

/* Henter fagets spørsmålsfil og teller typene.
   Mangler filen, markeres faget som tomt i stedet for å velte siden. */
async function tellSporsmal(fag) {
  try {
    const svar = await fetch(`data/${fag.id}.json`);
    if (!svar.ok) throw new Error(svar.status);

    const data = await svar.json();
    const sporsmal = data.sporsmal ?? [];

    return {
      ...fag,
      flervalg: sporsmal.filter((s) => s.type === "flervalg").length,
      langsvar: sporsmal.filter((s) => s.type === "langsvar").length,
    };
  } catch (e) {
    return { ...fag, flervalg: 0, langsvar: 0 };
  }
}

function lagRad(fag) {
  const rad = document.createElement("li");
  const artikkel = document.createElement("article");

  const tittel = document.createElement("h2");
  const lenke = document.createElement("a");
  lenke.href = `ove.html?fag=${encodeURIComponent(fag.id)}`;
  lenke.textContent = fag.navn;
  tittel.append(lenke);

  const kode = document.createElement("p");
  kode.className = "kode";
  kode.textContent = fag.kode ?? "";

  const antall = document.createElement("p");
  antall.className = "antall";

  const totalt = fag.flervalg + fag.langsvar;
  if (totalt === 0) {
    antall.classList.add("tom");
    antall.textContent = `Ingen spørsmål ennå. Legg dem i data/${fag.id}.json`;
  } else {
    antall.textContent = `${fag.flervalg} flervalg, ${fag.langsvar} langsvar`;
  }

  artikkel.append(tittel, kode, antall);
  rad.append(artikkel);
  return rad;
}

function lagStatustekst(fag) {
  const totalt = fag.reduce((sum, f) => sum + f.flervalg + f.langsvar, 0);

  if (totalt === 0) {
    return "Ingen spørsmål lagt inn ennå. Begynn med ett fag og fem spørsmål.";
  }

  return `${totalt} spørsmål fordelt på ${fag.length} fag. Velg hvor du vil begynne.`;
}

function visFeil() {
  feil.innerHTML =
    "Fant ikke <code>data/fag.json</code>. Åpner du siden rett fra filsystemet, " +
    "blokkerer nettleseren lesing av JSON-filer. Kjør <code>python3 -m http.server</code> " +
    "i prosjektmappa og gå til <code>http://localhost:8000</code>.";
  feil.hidden = false;
}