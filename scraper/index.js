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

async function getFinalUrl(url) {
  try {
    // manual redirect to capture the final redirected URL
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      console.warn(`⚠️  Failed to resolve URL ${url}: ${res.status}`);
      return null;
    }
    // res.url gives the final URL after all redirects
    return res.url;
  } catch (err) {
    console.warn(`⚠️  Error resolving URL ${url}: ${err.message}`);
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

      // Follow redirects to get the real final stream URL
      const realStreamUrl = await getFinalUrl(url);

      if (!realStreamUrl) {
        console.warn(`⚠️  Skipping id=${id}, could not resolve final URL`);
        return null;
      }

      // Extract rawName from real URL: /bpk-tv/CNBC_Tv18_Prime_HD_BTS/
      const bpkMatch = realStreamUrl.match(/\/bpk-tv\/([^/]+)\//);
      let rawName = bpkMatch ? bpkMatch[1] : String(id);
      rawName = rawName.replace("_BTS", "");

      // Display name from JSON channel_name field
      const displayName = channel_name || rawName.replace(/_/g, " ");

      // Fetch the actual decryption key
      const fetchedKey = await fetchKey(kid, key);

      // Extract __hdnea__ cookie from real stream URL
      const cookieMatch = realStreamUrl.match(/__hdnea__=([^&|]+)/);
      const cookie = cookieMatch ? `__hdnea__=${cookieMatch[1]}` : "";

      // Base URL without query string
      const baseUrl = realStreamUrl.split("?")[0];

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

  // Filter out any nulls from failed channels
  const filtered = result.filter(Boolean);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filtered, null, 4));
  console.log(`\n✅ output.json generated with ${filtered.length} channels`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
