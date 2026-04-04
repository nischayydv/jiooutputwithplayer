import fs from "fs";

const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

async function fetchKey(kid, key) {
  const keyUrl = kid + ":" + key;
  try {
    const res = await fetch(keyUrl, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) return await fetchKey("https", location.replace("https://", "//"));
    }
    if (!res.ok) {
      console.warn(`⚠️  Failed to fetch key from ${keyUrl}: ${res.status}`);
      return { kid: null, k: null };
    }
    const json = await res.json();
    const keyObj = json.keys?.[0];
    return {
      kid: keyObj?.kid || null,
      k: keyObj?.k || null
    };
  } catch (err) {
    console.warn(`⚠️  Error fetching key from ${keyUrl}: ${err.message}`);
    return { kid: null, k: null };
  }
}

async function getFinalUrl(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        console.log(`  📌 Redirected to: ${location}`);
        return location;
      }
    }
    if (!res.ok) {
      console.warn(`⚠️  Failed to resolve URL ${url}: ${res.status}`);
      return null;
    }
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

      // Step 1: Get real stream URL via redirect
      const realStreamUrl = await getFinalUrl(url);
      if (!realStreamUrl) {
        console.warn(`⚠️  Skipping id=${id}, could not resolve final URL`);
        return null;
      }

      // Step 2: Extract rawName from /bpk-tv/NAME_BTS/
      const bpkMatch = realStreamUrl.match(/\/bpk-tv\/([^/]+)\//);
      let rawName = bpkMatch ? bpkMatch[1] : String(id);
      rawName = rawName.replace("_BTS", "");

      const displayName = channel_name || rawName.replace(/_/g, " ");

      // Step 3: Fetch real kid and k from key endpoint JSON
      const { kid: realKid, k: realKey } = await fetchKey(kid, key);

      // Step 4: Extract __hdnea__ token from real stream URL
      const hdneaMatch = realStreamUrl.match(/(__hdnea__=[^&|]+)/);
      const cookie = hdneaMatch ? hdneaMatch[1] : "";

      // Step 5: Clean MPD base URL (no query string)
      const mpdUrl = realStreamUrl.split("?")[0];

      // Step 6: Build jioplayer link
      // Format: https://jioplayer.pages.dev/?url=MPD&keyId=KID&key=KEY&cookie=COOKIE
      const playerUrl =
        DASH_PROXY +
        encodeURIComponent(mpdUrl) +
        `&keyId=${encodeURIComponent(realKid || "")}` +
        `&key=${encodeURIComponent(realKey || "")}` +
        (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "");

      console.log(`  ✅ ${displayName} (id: ${id}) | kid: ${realKid}`);

      return {
        name: displayName,
        id,
        logo: tvg_logo,
        group: group_title,
        link: playerUrl
      };
    })
  );

  const filtered = result.filter(Boolean);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filtered, null, 4));
  console.log(`\n✅ output.json generated with ${filtered.length} channels`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
