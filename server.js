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
    // CITROEN
    "citroen c3 picasso",
    "citroen c4 picasso",
    "citroen xsara picasso",
    "citroen c1",
    "citroen c2",
    "citroen c3",
    "citroen c4",
    "citroen c5",
    "citroen berlingo",

    // PEUGEOT
    "peugeot 108",
    "peugeot 107",
    "peugeot 206",
    "peugeot 207",
    "peugeot 208",
    "peugeot 2008",
    "peugeot 307",
    "peugeot 308",
    "peugeot 3008",
    "peugeot 407",
    "peugeot 508",
    "peugeot 5008",
    "peugeot partner",

    // RENAULT
    "renault twingo",
    "renault clio",
    "renault megane",
    "renault scenic",
    "renault captur",
    "renault kadjar",
    "renault kangoo",
    "renault trafic",

    // DACIA
    "dacia sandero",
    "dacia duster",
    "dacia logan",
    "dacia lodgy",

    // VOLKSWAGEN
    "volkswagen polo",
    "volkswagen golf",
    "volkswagen passat",
    "volkswagen tiguan",
    "volkswagen touran",
    "volkswagen caddy",

    // OPEL
    "opel corsa",
    "opel astra",
    "opel mokka",
    "opel meriva",
    "opel zafira",
    "opel insignia",

    // FORD
    "ford fiesta",
    "ford focus",
    "ford c-max",
    "ford kuga",
    "ford mondeo",
    "ford transit",

    // FIAT
    "fiat 500",
    "fiat panda",
    "fiat punto",
    "fiat tipo",
    "fiat doblo",

    // AUDI / BMW / MERCEDES
    "audi a1",
    "audi a3",
    "audi a4",
    "audi q3",
    "audi q5",
    "bmw serie 1",
    "bmw serie 3",
    "bmw x1",
    "bmw x3",
    "mercedes classe a",
    "mercedes classe b",
    "mercedes classe c",

    // NISSAN / TOYOTA / KIA / HYUNDAI
    "nissan micra",
    "nissan juke",
    "nissan qashqai",
    "toyota yaris",
    "toyota auris",
    "toyota corolla",
    "toyota rav4",
    "kia picanto",
    "kia rio",
    "kia sportage",
    "hyundai i10",
    "hyundai i20",
    "hyundai i30",
    "hyundai tucson"
  ];

  for (const model of knownModels) {
    if (text.includes(model)) return model;
  }

  return title;
}

function buildAutoScoutUrl(searchTerm) {
  const text = normalize(searchTerm);

  const routes = {
    "citroen c3 picasso": "citroen/c3-picasso",
    "citroen c4 picasso": "citroen/c4-picasso",
    "citroen xsara picasso": "citroen/xsara-picasso",
    "citroen c1": "citroen/c1",
    "citroen c2": "citroen/c2",
    "citroen c3": "citroen/c3",
    "citroen c4": "citroen/c4",
    "citroen c5": "citroen/c5",
    "citroen berlingo": "citroen/berlingo",

    "peugeot 107": "peugeot/107",
    "peugeot 108": "peugeot/108",
    "peugeot 206": "peugeot/206",
    "peugeot 207": "peugeot/207",
    "peugeot 208": "peugeot/208",
    "peugeot 2008": "peugeot/2008",
    "peugeot 307": "peugeot/307",
    "peugeot 308": "peugeot/308",
    "peugeot 3008": "peugeot/3008",
    "peugeot 407": "peugeot/407",
    "peugeot 508": "peugeot/508",
    "peugeot 5008": "peugeot/5008",
    "peugeot partner": "peugeot/partner",

    "renault twingo": "renault/twingo",
    "renault clio": "renault/clio",
    "renault megane": "renault/megane",
    "renault scenic": "renault/scenic",
    "renault captur": "renault/captur",
    "renault kadjar": "renault/kadjar",
    "renault kangoo": "renault/kangoo",
    "renault trafic": "renault/trafic",

    "dacia sandero": "dacia/sandero",
    "dacia duster": "dacia/duster",
    "dacia logan": "dacia/logan",
    "dacia lodgy": "dacia/lodgy",

    "volkswagen polo": "volkswagen/polo",
    "volkswagen golf": "volkswagen/golf",
    "volkswagen passat": "volkswagen/passat",
    "volkswagen tiguan": "volkswagen/tiguan",
    "volkswagen touran": "volkswagen/touran",
    "volkswagen caddy": "volkswagen/caddy",

    "opel corsa": "opel/corsa",
    "opel astra": "opel/astra",
    "opel mokka": "opel/mokka",
    "opel meriva": "opel/meriva",
    "opel zafira": "opel/zafira",
    "opel insignia": "opel/insignia",

    "ford fiesta": "ford/fiesta",
    "ford focus": "ford/focus",
    "ford c-max": "ford/c-max",
    "ford kuga": "ford/kuga",
    "ford mondeo": "ford/mondeo",
    "ford transit": "ford/transit",

    "fiat 500": "fiat/500",
    "fiat panda": "fiat/panda",
    "fiat punto": "fiat/punto",
    "fiat tipo": "fiat/tipo",
    "fiat doblo": "fiat/doblo",

    "audi a1": "audi/a1",
    "audi a3": "audi/a3",
    "audi a4": "audi/a4",
    "audi q3": "audi/q3",
    "audi q5": "audi/q5",

    "bmw serie 1": "bmw/serie-1",
    "bmw serie 3": "bmw/serie-3",
    "bmw x1": "bmw/x1",
    "bmw x3": "bmw/x3",

    "mercedes classe a": "mercedes-benz/classe-a",
    "mercedes classe b": "mercedes-benz/classe-b",
    "mercedes classe c": "mercedes-benz/classe-c",

    "nissan micra": "nissan/micra",
    "nissan juke": "nissan/juke",
    "nissan qashqai": "nissan/qashqai",

    "toyota yaris": "toyota/yaris",
    "toyota auris": "toyota/auris",
    "toyota corolla": "toyota/corolla",
    "toyota rav4": "toyota/rav-4",

    "kia picanto": "kia/picanto",
    "kia rio": "kia/rio",
    "kia sportage": "kia/sportage",

    "hyundai i10": "hyundai/i10",
    "hyundai i20": "hyundai/i20",
    "hyundai i30": "hyundai/i30",
    "hyundai tucson": "hyundai/tucson"
  };

  for (const model in routes) {
    if (text.includes(model)) {
      return `https://www.autoscout24.fr/lst/${routes[model]}?atype=C&cy=F&ustate=N%2CU&sort=standard&desc=0`;
    }
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

    const ads = await page.evaluate(({ searchTerm, targetYear, targetKm }) => {
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

      const minYear = targetYear - 1;
      const maxYear = targetYear + 1;
      const minKm = Math.max(0, targetKm - 10000);
      const maxKm = targetKm + 10000;

      const results = [];

      for (let i = 0; i < lines.length; i++) {
        const blockLines = lines.slice(i, i + 35);
        const block = blockLines.join(" ");
        const normalizedBlock = clean(block);

        if (!normalizedBlock.includes(wanted)) continue;
        if (normalizedBlock.includes("aircross")) continue;

        let price = 0;

        const euroIndex = blockLines.findIndex(line => clean(line) === "€");

        if (euroIndex !== -1 && blockLines[euroIndex + 1]) {
          price = normalizePrice(blockLines[euroIndex + 1]);
        } else {
          const priceMatch = block.match(/€\s*[\d\s\u202F\u00A0.]+/);
          if (priceMatch) price = normalizePrice(priceMatch[0]);
        }

        const yearMatch = block.match(/\b(19|20)\d{2}\b/);
        const adYear = yearMatch ? parseInt(yearMatch[0]) : 0;

        const kmMatch = block.match(/[\d\s\u202F\u00A0.]+km/i);
        const adKm = kmMatch ? toNum(kmMatch[0]) : 0;

       if (!price || !adYear || !adKm) continue;
       if (price < 1000 || price > 100000) continue;

       const yearOk = adYear >= minYear && adYear <= maxYear;
       const kmOk = adKm >= minKm && adKm <= maxKm;

       if (yearOk && kmOk) {
       results.push({
       price,
       year: adYear,
       km: adKm
      });
      }
   } 

      const unique = [];
      const seen = new Set();

      for (const ad of results) {
        const key = `${ad.price}-${ad.year}-${ad.km}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(ad);
        }
      }

      return unique.slice(0, 10);
    }, { searchTerm, targetYear, targetKm });

    console.log("🚗 ANNONCES AUTOSCOUT:", ads);

    return ads.map(ad => ad.price);
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

  const minYear = targetYear - 1;
  const maxYear = targetYear + 1;
  const minKm = Math.max(0, targetKm - 10000);
  const maxKm = targetKm + 10000;

  console.log("🔎 RECHERCHE SIMPLIFIÉE:", searchTerm);
  console.log("📅 FILTRE ANNÉE:", minYear, "à", maxYear);
  console.log("📍 FILTRE KM:", minKm, "à", maxKm);

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
    filterYear: `${minYear}-${maxYear}`,
    filterKm: `${minKm}-${maxKm}`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SERVER OK ${PORT}`);
});