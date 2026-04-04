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

  const channels = Array.isArray(raw) ? raw : Object.values(raw);
  console.log(`🔄 Processing ${channels.length} channels...`);

  const result = channels
    .filter((channel) => {
      if (!channel.url && !channel.mpd) {
        console.warn(`⚠️  Skipping channel id=${channel.id || "?"} — no url/mpd field`);
        return false;
      }
      return true;
    })
    .map((channel) => {
      const { id, name, logo, category, drm } = channel;

      // Use url field (has cookie) or fallback to mpd
      const fullUrl = channel.url || channel.mpd;

      // Split MPD base and cookie query string
      const [mpdUrl, queryString] = fullUrl.split("?");

      // Extract __hdnea__ cookie from query string
      const hdneaMatch = queryString ? queryString.match(/(__hdnea__=[^&]+)/) : null;
      const cookie = hdneaMatch ? hdneaMatch[1] : "";

      // Extract rawName from mpd URL: /bpk-tv/CNBC_Tv18_Prime_HD_BTS/
      const bpkMatch = mpdUrl.match(/\/bpk-tv\/([^/]+)\//);
      let rawName = bpkMatch ? bpkMatch[1] : String(id);
      rawName = rawName.replace("_BTS", "");

      // Get keyId and key directly from drm object
      const drmEntries = Object.entries(drm || {});
      const realKid = drmEntries.length > 0 ? drmEntries[0][0] : "";
      const realKey = drmEntries.length > 0 ? drmEntries[0][1] : "";

      // Build jioplayer link
      const playerUrl =
        DASH_PROXY +
        encodeURIComponent(mpdUrl) +
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
