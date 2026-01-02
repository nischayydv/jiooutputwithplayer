import fs from "fs";

const INPUT_URL =
  "https://raw.githubusercontent.com/vaathala00/jo/main/stream.json";

const OUTPUT_FILE = "output.json";

const DASH_PROXY = "https://dash.vodep39240327.workers.dev/?url=";
const LOGO_BASE =
  "https://jiotv.catchup.cdn.jio.com/dare_images/images/";

function formatDisplayName(rawName) {
  return rawName
    .replace(/TV(\d+)/g, " TV$1")        // TV18 → TV18 (with space)
    .replace(/HD$/g, " HD")              // ColorsHD → Colors HD
    .replace(/([a-z])([A-Z])/g, "$1 $2") // PrimeNews → Prime News
    .trim();
}

async function main() {
  console.log("📥 Fetching remote stream.json...");

  const res = await fetch(INPUT_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${res.status}`);
  }

  const raw = await res.json();

  const result = Object.entries(raw).map(([id, data]) => {
    const { kid, key, url } = data;

    // Extract raw channel name (used for logo & stream)
    let rawName = url.split("/bpk-tv/")[1].split("/")[0];
    rawName = rawName.replace("_BTS", "");

    // Human-readable name
    const displayName = formatDisplayName(rawName);

    // Extract cookie
    const cookieMatch = url.match(/__hdnea__=([^&]+)/);
    const cookie = cookieMatch ? `__hdnea__=${cookieMatch[1]}` : "";

    const finalUrl =
      `${url.split("?")[0]}` +
      `?name=${encodeURIComponent(rawName)}` +
      `&keyId=${kid}` +
      `&key=${key}` +
      (cookie ? `&cookie=${cookie}` : "");

    return {
      name: displayName,
      id,
      logo: `${LOGO_BASE}${rawName}.png`,
      group: "Jio+",
      link: DASH_PROXY + finalUrl
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 4));
  console.log("✅ output.json generated");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
