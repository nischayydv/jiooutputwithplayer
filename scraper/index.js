import fs from "fs";

const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://jioplayer.pages.dev/",
  "Origin": "https://jioplayer.pages.dev"
};

async function fetchKey(kid, key) {
  const keyUrl = kid + ":" + key;
  try {
    const res = await fetch(keyUrl, { headers: HEADERS });
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
    const res = await fetch(url, {
      redirect: "follow",
      headers: HEADERS
    });

    // 451 or other error — try extracting Location header manually
    if (!res.ok) {
      console.warn(`⚠️  Status ${res.status} for ${url}`);
      // Some workers return redirect in body as plain text URL
      const body = await res.text();
      const urlMatch = body.match(/https?:\/\/[^\s"'<>]+/);
      if (urlMatch) {
        console.log(`  📌 Extracted URL from body: ${urlMatch[0]}`);
        return urlMatch[0];
      }
      return null;
    }

    // res.url = final URL after redirects
    return res.url;
  } catch (err) {
    console.warn(`⚠️  Error resolving URL ${url}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("📥 Fetching remote stream.json...");
  const res = await fetch(INPUT_URL, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${res.status}`);
  }
  const raw = await res.json();

  const entries = Object.entries(raw);
  console.log(`🔄 Processing ${entries.length} channels...`);

  const result = await Promise.all(
    entries.map(async ([id, data]) => {
      const { kid, key, url, group_title, tvg_logo, channel_name } = data;

      // Follow redirects (with browser headers) to get the real final stream URL
      const realStreamUrl = await getFinalUrl(url);

      if (!realStreamUrl) {
        console.warn(`⚠️  Skipping id=${id}, could not resolve final URL`);
        return null;
      }

      console.log(`  🔗 Resolved: ${realStreamUrl}`);

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

  const filtered = result.filter(Boolean);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filtered, null, 4));
  console.log(`\n✅ output.json generated with ${filtered.length} channels`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
