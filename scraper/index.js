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

  const channels = Array.isArray(raw) ? Object.entries({ ...raw }) : Object.entries(raw);
  console.log(`🔄 Processing ${channels.length} channels...`);

  const result = channels
    .filter(([id, channel]) => {
      if (!channel.url) {
        console.warn(`⚠️  Skipping id=${id} — no url field`);
        return false;
      }
      return true;
    })
    .map(([id, channel]) => {
      const { kid, key, url, group_title, tvg_logo, channel_name } = channel;

      // Split MPD base URL and query string
      const [mpdUrl, queryString] = url.split("?");

      // Extract __hdnea__ cookie from query string
      const hdneaMatch = queryString ? queryString.match(/(__hdnea__=[^&]+)/) : null;
      const cookie = hdneaMatch ? hdneaMatch[1] : "";

      // Extract rawName from /bpk-tv/CNBC_Tv18_Prime_HD_BTS/
      const bpkMatch = mpdUrl.match(/\/bpk-tv\/([^/]+)\//);
      let rawName = bpkMatch ? bpkMatch[1] : String(id);
      rawName = rawName.replace("_BTS", "");

      const displayName = channel_name || rawName.replace(/_/g, " ");

      // kid and key are directly in the JSON — no fetching needed
      const playerUrl =
        DASH_PROXY +
        encodeURIComponent(mpdUrl) +
        `&keyId=${encodeURIComponent(kid)}` +
        `&key=${encodeURIComponent(key)}` +
        (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "");

      console.log(`  ✅ ${displayName} (id: ${id}) | kid: ${kid}`);

      return {
        name: displayName,
        id,
        logo: tvg_logo,
        group: group_title,
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
