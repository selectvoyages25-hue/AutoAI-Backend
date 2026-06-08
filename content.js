console.log("🚀 AUTO1 AI EXTENSION ACTIVE");

const box = document.createElement("div");

box.style = `
position:fixed;
top:90px;
right:20px;
width:380px;
background:white;
border:2px solid #ff6a00;
padding:15px;
z-index:999999;
border-radius:12px;
font-family:Arial;
box-shadow:0 10px 30px rgba(0,0,0,0.2);
font-size:14px;
`;

box.innerHTML = `
<h3>🚗 Auto1 AI Analyzer</h3>
<p>Chargement fiche Auto1...</p>
`;

document.body.appendChild(box);

function cleanText(text) {
  return String(text || "")
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBetween(text, start, end) {
  const s = text.indexOf(start);
  if (s === -1) return "";
  const from = s + start.length;
  const e = text.indexOf(end, from);
  if (e === -1) return "";
  return cleanText(text.slice(from, e));
}

function extractData() {
  const pageText = document.body.innerText;

  const titleMatch = pageText.match(/ENCHÈRES 24H\s+\d+\s+(.+?)\n/);
  const title = titleMatch ? cleanText(titleMatch[1]) : "Auto1";

  const priceMatch = pageText.match(/Offre en cours:\s*([\d\s\u202F\u00A0]+€)/);
  const price = priceMatch ? cleanText(priceMatch[1]) : "0 €";

  const year = extractBetween(pageText, "Année de construction:", "Première immatriculation:");
  const registration = extractBetween(pageText, "Première immatriculation:", "Relevé du compteur kilométrique:");
  const km = extractBetween(pageText, "Relevé du compteur kilométrique:", "Type de carburant:");
  const fuel = extractBetween(pageText, "Type de carburant:", "Puissance:");
  const power = extractBetween(pageText, "Puissance:", "Cylindrée:");

  const searchQuery = cleanText(`${title} ${year} ${fuel} ${power}`);

  return {
    title,
    price,
    km,
    year,
    registration,
    fuel,
    power,
    searchQuery,
    url: window.location.href
  };
}

function waitAndAnalyze(retry = 0) {
  const data = extractData();

  console.log("📦 DATA AUTO1:", data);

  if ((data.title === "Auto1" || data.price === "0 €") && retry < 25) {
    box.innerHTML = `
    <h3>🚗 Auto1 AI Analyzer</h3>
    <p>Attente chargement véhicule... ${retry + 1}/25</p>
    `;

    setTimeout(() => waitAndAnalyze(retry + 1), 1000);
    return;
  }

  chrome.runtime.sendMessage({
    type: "ANALYZE",
    data: data
  }, (res) => {

    console.log("✅ REPONSE BACKGROUND:", res);

    if (!res || res.error) {
      box.innerHTML = `
      <h3>🚗 Auto1 AI Analyzer</h3>
      <p style="color:red">Erreur API ❌</p>
      <p>${res?.error || "Backend non accessible"}</p>
      `;
      return;
    }

    const marginColor = Number(res.margin) >= 0 ? "green" : "red";

    box.innerHTML = `
    <h3>🚗 Auto1 AI Analyzer</h3>

    <p><b>${data.title}</b></p>

    <hr>

    <p>💰 Auto1 : ${res.price}</p>
    <p>📊 Marché moyen : ${res.marketAverage} €</p>
    <p>📉 Prix mini Autoscout24 : ${res.minPrice || 0} €</p>
    <p>📈 Prix maxi Autoscout24 : ${res.maxPrice || 0} €</p>
    <p>📦 Annonces comparées : ${res.sampleCount || 0}</p>

    <hr>

    <p>📍 KM : ${data.km}</p>
    <p>📅 Année : ${data.year}</p>
    <p>⛽ Carburant : ${data.fuel}</p>
    <p>⚡ Puissance : ${data.power}</p>

    <h2 style="color:${marginColor}">
      ${res.margin} €
    </h2>

    <p>🎯 Score IA : ${res.score}/100</p>
    <p>🔎 Recherche Autoscout24 : ${res.searchTerm || data.searchQuery}</p>
    `;
  });
}

setTimeout(() => waitAndAnalyze(), 3000);