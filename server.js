const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SERVER OK 🚀");
});

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/citroën/g, "citroen")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value) {
  return parseInt(String(value || "").replace(/[^\d]/g, "")) || 0;
}

function simplifySearch(title) {
  const text = normalize(title);

  const knownModels = [
    "citroen c3",
    "citroen xsara picasso",
    "citroen c4 picasso",
    "peugeot 2008",
    "peugeot 3008",
    "peugeot 208",
    "renault clio",
    "renault megane",
    "volkswagen golf",
    "audi a3",
    "bmw serie 3"
  ];

  for (const model of knownModels) {
    if (text.includes(model)) return model;
  }

  return title;
}

function buildAutoScoutUrl(searchTerm) {
  const text = normalize(searchTerm);

  if (text.includes("citroen c3")) {
    return "https://www.autoscout24.fr/lst/citroen/c3?atype=C&cy=F&ustate=N%2CU&sort=standard&desc=0";
  }

  if (text.includes("citroen xsara picasso")) {
    return "https://www.autoscout24.fr/lst/citroen/xsara-picasso?atype=C&cy=F&ustate=N%2CU&sort=standard&desc=0";
  }

  if (text.includes("peugeot 2008")) {
    return "https://www.autoscout24.fr/lst/peugeot/2008?atype=C&cy=F&ustate=N%2CU&sort=standard&desc=0";
  }

  return `https://www.autoscout24.fr/lst?atype=C&cy=F&ustate=N%2CU&sort=standard&desc=0&q=${encodeURIComponent(searchTerm)}`;
}

async function getAutoScoutPrices(searchTerm, targetYear, targetKm) {
  const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

  try {
    const page = await browser.newPage();

    const url = buildAutoScoutUrl(searchTerm);
    console.log("🔎 URL AutoScout24:", url);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(10000);

    const prices = await page.evaluate(({ searchTerm, targetYear, targetKm }) => {
      const clean = (txt) =>
        String(txt || "")
          .toLowerCase()
          .replace(/citroën/g, "citroen")
          .replace(/\s+/g, " ")
          .trim();

      const toNum = (txt) =>
        parseInt(String(txt || "").replace(/[^\d]/g, "")) || 0;

      const normalizePrice = (priceRaw) => {
        let digits = String(priceRaw || "").replace(/[^\d]/g, "");

        if (digits.length === 6 && digits.endsWith("1")) {
          digits = digits.slice(0, -1);
        }

        return parseInt(digits) || 0;
      };

      const wanted = clean(searchTerm);
      const text = document.body.innerText || "";
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

      const minYear = targetYear - 5;
      const maxYear = targetYear + 5;
      const minKm = targetKm - 50000;
      const maxKm = targetKm + 50000;

      const results = [];

      for (let i = 0; i < lines.length; i++) {
        const current = clean(lines[i]);

        if (!current.includes(wanted)) continue;

        const blockLines = lines.slice(i, i + 25);
        const block = blockLines.join(" ");
        const normalizedBlock = clean(block);

        if (normalizedBlock.includes("aircross")) continue;

        const euroIndex = blockLines.findIndex(line => clean(line) === "€");

        if (euroIndex === -1 || !blockLines[euroIndex + 1]) continue;

        const price = normalizePrice(blockLines[euroIndex + 1]);

        const yearMatch = block.match(/\b(19|20)\d{2}\b/);
        const adYear = yearMatch ? parseInt(yearMatch[0]) : 0;

        const kmMatch = block.match(/[\d\s\u202F\u00A0.]+km/i);
        const adKm = kmMatch ? toNum(kmMatch[0]) : 0;

        if (!price || !adYear || !adKm) continue;

        const yearOk = adYear >= minYear && adYear <= maxYear;
        const kmOk = adKm >= minKm && adKm <= maxKm;

        if (yearOk && kmOk && price > 1000 && price < 100000) {
          results.push(price);
        }
      }

      return [...new Set(results)];
    }, { searchTerm, targetYear, targetKm });

    return prices.slice(0, 10);
  } finally {
    await browser.close();
  }
}

app.post("/analyze", async (req, res) => {
  console.log("🔥 DATA REÇUE:", req.body);

  const rawTitle = req.body.title || "Voiture";
  const searchTerm = simplifySearch(rawTitle);

  const autoPrice = toNumber(req.body.price);
  const targetYear = toNumber(req.body.year);
  const targetKm = toNumber(req.body.km);

  console.log("🔎 RECHERCHE SIMPLIFIÉE:", searchTerm);
  console.log("📅 FILTRE ANNÉE:", targetYear - 1, "à", targetYear + 1);
  console.log("📍 FILTRE KM:", targetKm - 10000, "à", targetKm + 10000);

  let prices = [];

  try {
    prices = await getAutoScoutPrices(searchTerm, targetYear, targetKm);
    console.log("📊 PRIX AUTOSCOUT FILTRÉS:", prices);
  } catch (err) {
    console.log("❌ ERREUR AUTOSCOUT:", err.message);
  }

  prices.sort((a, b) => a - b);

  const minPrice = prices.length ? prices[0] : 0;
  const maxPrice = prices.length ? prices[prices.length - 1] : 0;

  const marketAverage = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : autoPrice + 2500;

  const margin = marketAverage - autoPrice;

  let score = 50;
  if (margin > 5000) score = 98;
  else if (margin > 3000) score = 95;
  else if (margin > 1000) score = 80;
  else if (margin > -1000) score = 60;
  else score = 30;

  res.json({
    title: rawTitle,
    searchTerm,
    source: "AutoScout24",
    price: autoPrice + " €",
    marketAverage,
    minPrice,
    maxPrice,
    margin,
    score,
    sampleCount: prices.length,
    filterYear: `${targetYear - 1}-${targetYear + 1}`,
    filterKm: `${targetKm - 10000}-${targetKm + 10000}`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SERVER OK ${PORT}`);
});