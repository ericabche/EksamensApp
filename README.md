# Eksamensøving

En enkel nettside for å øve til eksamen med flervalgs- og langsvarsoppgaver, med sammendrag å lese under hvert kapittel.

Bygget uten rammeverk og uten byggesteg: ren HTML, CSS og JavaScript. Alt innhold ligger i JSON-filer under `data/`, slik at nye spørsmål kan legges til uten å røre koden.

**Siden:** https://ericabche.github.io/EksamensApp/

## Funksjoner

- Flervalg med retting, forklaring og oppsummering
- Langsvar med momentliste for selvretting mot et modellsvar
- Filtrering på kapittel, eller alle kapitler blandet
- Valgfri øktlengde, med tilfeldig trekning fra utvalget
- Sammendrag per kapittel, med lenke rett til å øve på samme kapittel
- Lys og mørk modus etter systeminnstillingen

## Kjøre lokalt

Sida henter JSON med `fetch()`, og nettleseren blokkerer det når filer åpnes direkte fra disk. Bruk en lokal server:

```bash
python3 -m http.server 8000
```

Gå så til `http://localhost:8000`. Live Server i VS Code fungerer like godt.

## Mappestruktur

```
.
├── index.html          oversikt over fagene
├── ove.html            øvingsøkt
├── les.html            sammendrag
├── css/
│   └── style.css
├── js/
│   ├── index.js
│   ├── ove.js
│   └── les.js
└── data/
    ├── fag.json                 registeret over fagene
    ├── <fag>.json               spørsmålene for ett fag
    └── <fag>-sammendrag.json    sammendragene for ett fag
```

## Datamodell

### `data/fag.json`

Lista som forsiden bygges fra. `id` må matche filnavnene i `data/`.

```json
[
  { "id": "co3049", "kode": "CO3049", "navn": "Web Programming" }
]
```

### `data/<fag>.json`

Kapitteloversikt og spørsmål. Kapittellista i grensesnittet bygges fra spørsmålene som faktisk finnes, så et kapittel uten spørsmål vises ikke.

```json
{
  "fag": "Web Programming",
  "kapitler": { "1": "HTML5 og skjema" },
  "sporsmal": [
    {
      "id": "web-001",
      "type": "flervalg",
      "kapittel": 1,
      "sporsmal": "Spørsmålsteksten",
      "kode": "valgfritt kodeutdrag",
      "alternativer": ["A", "B", "C", "D"],
      "fasit": 2,
      "forklaring": "Hvorfor C er riktig"
    },
    {
      "id": "web-002",
      "type": "langsvar",
      "kapittel": 1,
      "sporsmal": "Forklar ...",
      "momenter": ["Punkt som bør være med", "Enda et punkt"],
      "modellsvar": "Et fullstendig svar"
    }
  ]
}
```

`fasit` er indeksen i `alternativer`, med start på 0.

### `data/<fag>-sammendrag.json`

Hvert kapittel er en liste med linjer. Prefikser styrer formatet:

| Linje | Blir |
|---|---|
| `## Tittel` | mellomtittel |
| `- punkt` | punkt i liste |
| `` `kode` `` midt i teksten | innebygd kode |
| `{ "kode": "..." }` | kodeblokk |
| alt annet | avsnitt |

```json
{
  "fag": "Web Programming",
  "kapitler": {
    "1": [
      "Et avsnitt med `kode` i.",
      "## En mellomtittel",
      "- Et punkt",
      { "kode": "<p>en kodeblokk</p>" }
    ]
  }
}
```

Filen er valgfri. Mangler den, viser `les.html` kapitlene som «ikke skrevet», og øvingen fungerer som før.

## Legge til et fag

1. Legg til en linje i `data/fag.json`.
2. Lag `data/<id>.json` med `kapitler` og `sporsmal`.
3. Lag eventuelt `data/<id>-sammendrag.json`.

Ingen kode må endres. Filnavn skrives med små bokstaver – GitHub Pages skiller på store og små, selv om macOS ikke gjør det.

## Om innholdet

Spørsmålene er laget for egen eksamensøving. Der de bygger på tidligere eksamensoppgaver, er de omskrevet og oversatt, og fasit og forklaringer er utarbeidet selv – de er ikke hentet fra offisielle løsningsforslag og kan inneholde feil.
