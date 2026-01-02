import fs from "fs";

const INPUT_URL =
  "https://raw.githubusercontent.com/vaathala00/jo/main/stream.json";

const OUTPUT_FILE = "output.json";

const DASH_PROXY = "https://dash.vodep39240327.workers.dev/?url=";
const LOGO_BASE =
  "https://jiotv.catchup.cdn.jio.com/dare_images/images/";

/**
 * Convert raw channel name into human-readable form
 */
function formatDisplayName(name) {
  return name
    .replace(/_/g, " ")                  // Sun_TV_HD → Sun TV HD
    .replace(/TV(\d+)/g, " TV$1 ")       // CNBCTV18 → CNBC TV18
    .replace(/([a-z])([A-Z])/g, "$1 $2") // PrimeNews → Prime News
    .replace(/\s+/g, " ")                // clean extra spaces
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

    // Name used ONLY for stream URL
    let rawName = url.split("/bpk-tv/")[1].split("/")[0];
    rawName = rawName.replace("_BTS", "");

    // Name used for logo & display (remove _MOB only here)
    const cleanName = rawName.replace(/_MOB$/i, "");

    // Display name
    const displayName = formatDisplayName(cleanName);

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
      logo: `${LOGO_BASE}${cleanName}.png`,
      group: "Jio+",
      link: DASH_PROXY + finalUrl
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 4));
  console.log("✅ output.json generated successfully");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
