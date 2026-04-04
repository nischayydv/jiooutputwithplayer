import fs from "fs";

const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

async function main() {
  console.log("📥 Fetching remote stream.json...");
  const res = await fetch(INPUT_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${res.status}`);
  }
  const raw = await res.json();

  // Handle both array and object formats
  const channels = Array.isArray(raw) ? raw : Object.values(raw);

  console.log(`🔄 Processing ${channels.length} channels...`);

  const result = channels.map((channel) => {
    const { id, name, logo, category, mpd, token, drm } = channel;

    // Extract rawName from mpd URL: /bpk-tv/CNBC_Awaaz_BTS/
    const bpkMatch = mpd.match(/\/bpk-tv\/([^/]+)\//);
    let rawName = bpkMatch ? bpkMatch[1] : String(id);
    rawName = rawName.replace("_BTS", "");

    // Get keyId and key directly from drm object (no fetching needed)
    const drmEntries = Object.entries(drm || {});
    const realKid = drmEntries.length > 0 ? drmEntries[0][0] : "";
    const realKey = drmEntries.length > 0 ? drmEntries[0][1] : "";

    // token is already the cookie value
    const cookie = token || "";

    // Build jioplayer link
    const playerUrl =
      DASH_PROXY +
      encodeURIComponent(mpd) +
      `&keyId=${encodeURIComponent(realKid)}` +
      `&key=${encodeURIComponent(realKey)}` +
      (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "");

    console.log(`  ✅ ${name} (id: ${id}) | kid: ${realKid}`);

    return {
      name,
      id,
      logo,
      group: category,
      link: playerUrl
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 4));
  console.log(`\n✅ output.json generated with ${result.length} channels`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
