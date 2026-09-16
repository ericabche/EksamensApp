/* Viser sammendragene for ett fag.
   Uten ?kap= listes kapitlene, med ?kap= vises teksten for ett av dem. */

const params = new URLSearchParams(location.search);
const fagId = params.get("fag");
const valgtKap = params.get("kap");

const el = {
  fagnavn: document.getElementById("fagnavn"),
  status: document.getElementById("status"),
  kapitler: document.getElementById("kapitler"),
  innhold: document.getElementById("innhold"),
  bunnavigasjon: document.getElementById("bunnavigasjon"),
  feil: document.getElementById("feil"),
};

let fag = null;
let tekster = {};

start();

async function start() {
  if (!fagId) {
    visFeil("Ingen fag er valgt. Gå tilbake til <a href='index.html'>faglista</a>.");
    return;
  }

  try {
    const svar = await fetch(`data/${fagId}.json`);
    if (!svar.ok) throw new Error(svar.status);
    fag = await svar.json();
  } catch (e) {
    visFeil(`Fant ikke <code>data/${fagId}.json</code>. <a href="index.html">Tilbake til faglista</a>.`);
    return;
  }

  /* Sammendragene ligger i en egen fil, så øvingssida slipper å laste dem.
     Mangler filen, er det ikke en feil – faget har bare ikke fått tekst ennå. */
  try {
    const svar = await fetch(`data/${fagId}-sammendrag.json`);
    if (svar.ok) tekster = (await svar.json()).kapitler ?? {};
  } catch (e) {
    tekster = {};
  }

  document.title = `${fag.fag} – sammendrag`;
  el.fagnavn.textContent = fag.fag;

  valgtKap && tekster[valgtKap] ? visKapittel(valgtKap) : visKapittelliste();
}

/* ---------- Oversikt ---------- */

function visKapittelliste() {
  const numre = kapittelnumre();

  if (numre.length === 0) {
    visFeil(`Faget har ingen kapitler definert i <code>data/${fagId}.json</code>.`);
    return;
  }

  const liste = el.kapitler.querySelector(".rader");
  liste.replaceChildren(...numre.map(lagKapittelrad));

  const skrevet = numre.filter((nr) => tekster[nr]).length;
  el.status.textContent =
    skrevet === 0
      ? `Ingen sammendrag skrevet ennå. Legg dem i data/${fagId}-sammendrag.json`
      : `Sammendrag for ${skrevet} av ${numre.length} kapitler.`;

  el.kapitler.hidden = false;
}

function lagKapittelrad(nr) {
  const rad = document.createElement("li");
  const lenke = document.createElement("a");
  lenke.className = "rad";

  const tittel = document.createElement("span");
  tittel.textContent = `${nr}. ${fag.kapitler[nr]}`;

  const merke = document.createElement("span");
  merke.className = "rad-antall";

  if (tekster[nr]) {
    lenke.href = `les.html?fag=${encodeURIComponent(fagId)}&kap=${nr}`;
    merke.textContent = `${ordtelling(tekster[nr])} ord`;
  } else {
    lenke.setAttribute("aria-disabled", "true");
    lenke.className = "rad tom";
    merke.textContent = "ikke skrevet";
  }

  lenke.append(tittel, merke);
  rad.append(lenke);
  return rad;
}

/* ---------- Ett kapittel ---------- */

function visKapittel(nr) {
  const tittel = document.createElement("h2");
  tittel.className = "kapitteltittel";
  tittel.textContent = `${nr}. ${fag.kapitler[nr]}`;

  el.innhold.replaceChildren(tittel, ...tegnBlokker(tekster[nr]));
  el.innhold.hidden = false;

  el.status.textContent = `${fag.fag} — sammendrag`;
  byggBunnavigasjon(nr);
}

/* Teksten er en liste med linjer. «## » gir mellomtittel, «- » gir punkt,
   et objekt med kode-felt gir kodeblokk, resten blir avsnitt. */
function tegnBlokker(linjer) {
  const blokker = [];
  let punktliste = null;

  for (const linje of linjer) {
    if (typeof linje === "object" && linje.kode) {
      punktliste = null;
      blokker.push(lagKode(linje.kode));
      continue;
    }

    if (linje.startsWith("- ")) {
      if (!punktliste) {
        punktliste = document.createElement("ul");
        blokker.push(punktliste);
      }
      const punkt = document.createElement("li");
      punkt.append(...tegnTekst(linje.slice(2)));
      punktliste.append(punkt);
      continue;
    }

    punktliste = null;

    if (linje.startsWith("## ")) {
      const tittel = document.createElement("h3");
      tittel.textContent = linje.slice(3);
      blokker.push(tittel);
      continue;
    }

    const avsnitt = document.createElement("p");
    avsnitt.append(...tegnTekst(linje));
    blokker.push(avsnitt);
  }

  return blokker;
}

/* Bakoverfnutter markerer kode midt i teksten. Bygges som noder,
   ikke innerHTML, så teksten aldri tolkes som markup. */
function tegnTekst(tekst) {
  return tekst.split("`").map((bit, i) => {
    if (i % 2 === 0) return document.createTextNode(bit);
    const kode = document.createElement("code");
    kode.textContent = bit;
    return kode;
  });
}

function lagKode(kode) {
  const blokk = document.createElement("pre");
  const innhold = document.createElement("code");
  innhold.textContent = kode;
  blokk.append(innhold);
  return blokk;
}

function byggBunnavigasjon(nr) {
  const numre = kapittelnumre().filter((n) => tekster[n]);
  const plass = numre.indexOf(nr);

  const knapper = [
    lagLenkeknapp("Øv på kapittelet", `ove.html?fag=${encodeURIComponent(fagId)}&kap=${nr}`),
    lagLenkeknapp("Alle kapitler", `les.html?fag=${encodeURIComponent(fagId)}`, true),
  ];

  if (plass > 0) {
    knapper.push(lagLenkeknapp("Forrige", lesLenke(numre[plass - 1]), true));
  }
  if (plass < numre.length - 1) {
    knapper.push(lagLenkeknapp("Neste", lesLenke(numre[plass + 1]), true));
  }

  el.bunnavigasjon.replaceChildren(...knapper);
  el.bunnavigasjon.hidden = false;
}

function lesLenke(nr) {
  return `les.html?fag=${encodeURIComponent(fagId)}&kap=${nr}`;
}

function lagLenkeknapp(tekst, adresse, sekundaer) {
  const lenke = document.createElement("a");
  lenke.className = sekundaer ? "knapp sekundaer" : "knapp";
  lenke.href = adresse;
  lenke.textContent = tekst;
  return lenke;
}

/* ---------- Småting ---------- */

function kapittelnumre() {
  return Object.keys(fag.kapitler ?? {}).sort((a, b) => Number(a) - Number(b));
}

function ordtelling(linjer) {
  return linjer
    .map((l) => (typeof l === "object" ? "" : l))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function visFeil(melding) {
  el.feil.innerHTML = melding;
  el.feil.hidden = false;
}