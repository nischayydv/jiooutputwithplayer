import fs from "fs";

const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

async function fetchKey(kid, key) {
  const keyUrl = kid + ":" + key;
  try {
    const res = await fetch(keyUrl);
    if (!res.ok) {
      console.warn(`⚠️  Failed to fetch key from ${keyUrl}: ${res.status}`);
      return null;
    }
    const text = await res.text();
    return text.trim();
  } catch (err) {
    console.warn(`⚠️  Error fetching key from ${keyUrl}: ${err.message}`);
    return null;
  }
}

async function fetchMpd(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️  Failed to fetch MPD from ${url}: ${res.status}`);
      return null;
    }
    const text = await res.text();
    return text.trim();
  } catch (err) {
    console.warn(`⚠️  Error fetching MPD from ${url}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("📥 Fetching remote stream.json...");
  const res = await fetch(INPUT_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${res.status}`);
  }
  const raw = await res.json();

  const entries = Object.entries(raw);
  console.log(`🔄 Processing ${entries.length} channels...`);

  const result = await Promise.all(
    entries.map(async ([id, data]) => {
      const { kid, key, url, group_title, tvg_logo, channel_name } = data;

      const fetchedKey = await fetchKey(kid, key);
      const realStreamUrl = await fetchMpd(url);

      const displayName = channel_name || id;

      let rawName = channel_name
        ? channel_name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")
        : String(id);
      rawName = rawName.replace("_BTS", "");

      const cookieMatch = realStreamUrl
        ? realStreamUrl.match(/__hdnea__=([^&]+)/)
        : null;
      const cookie = cookieMatch ? `__hdnea__=${cookieMatch[1]}` : "";

      const baseUrl = realStreamUrl ? realStreamUrl.split("?")[0] : url;

      const finalUrl =
        `${baseUrl}` +
        `?name=${encodeURIComponent(rawName)}` +
        `&keyId=${encodeURIComponent(kid + ":" + key)}` +
        `&key=${encodeURIComponent(fetchedKey || "")}` +
        (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "");

      console.log(`  ✅ ${displayName} (id: ${id})`);

      return {
        name: displayName,
        id,
        logo: tvg_logo,
        group: group_title,
        link: DASH_PROXY + finalUrl
      };
    })
  );

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 4));
  console.log(`\n✅ output.json generated successfully with ${result.length} channels`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
