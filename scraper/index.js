import fs from "fs";

const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

async function fetchDrmKeys(licenseUrl, channelId) {
  try {
    // Combine kid + key to form the full license URL, append channel id
    const fullUrl = `${licenseUrl}=${channelId}`;
    const res = await fetch(fullUrl);
    if (!res.ok) {
      console.warn(`  ⚠️  Key fetch failed for id=${channelId}: ${res.status}`);
      return { keyId: "", decryptKey: "" };
    }
    const data = await res.json();
    // Adjust these fields based on actual API response shape
    return {
      keyId: data.kid || data.key_id || "",
      decryptKey: data.key || data.decrypt_key || ""
    };
  } catch (err) {
    console.warn(`  ⚠️  Key fetch error for id=${channelId}: ${err.message}`);
    return { keyId: "", decryptKey: "" };
  }
}

async function main() {
  console.log("📥 Fetching remote stream.json...");
  const res = await fetch(INPUT_URL);
  if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);

  const raw = await res.json();
  const channels = Array.isArray(raw)
    ? Object.entries({ ...raw })
    : Object.entries(raw);

  console.log(`🔄 Processing ${channels.length} channels...`);

  const result = [];

  for (const [id, channel] of channels) {
    if (!channel.url) {
      console.warn(`⚠️  Skipping id=${id} — no url field`);
      continue;
    }

    const { kid, key, url, group_title, tvg_logo, channel_name } = channel;

    // Reconstruct full DRM license base URL from split kid+key fields
    const licenseBaseUrl = `${kid}:${key}`;  // → "https://mini.allinonereborn.fun/key/key.php?id"

    // Split MPD base URL and query string
    const [mpdUrl, queryString] = url.split("?");

    // Extract __hdnea__ cookie
    const hdneaMatch = queryString?.match(/(__hdnea__=[^&]+)/);
    const cookie = hdneaMatch ? hdneaMatch[1] : "";

    // Extract channel rawName from URL path
    const bpkMatch = mpdUrl.match(/\/bpk-tv\/([^/]+)\//);
    let rawName = bpkMatch ? bpkMatch[1] : String(id);
    rawName = rawName.replace("_BTS", "").replace("_MOB", "");

    const displayName = channel_name || rawName.replace(/_/g, " ");

    // Fetch actual DRM key ID and decrypt key
    console.log(`  🔑 Fetching DRM keys for ${displayName} (id: ${id})...`);
    const { keyId, decryptKey } = await fetchDrmKeys(licenseBaseUrl, id);

    const playerUrl =
      DASH_PROXY +
      encodeURIComponent(mpdUrl) +
      `&keyId=${encodeURIComponent(keyId)}` +
      `&key=${encodeURIComponent(decryptKey)}` +
      (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "");

    console.log(`  ✅ ${displayName} | keyId: ${keyId}`);

    result.push({
      name: displayName,
      id,
      logo: tvg_logo,
      group: group_title,
      link: playerUrl
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 4));
  console.log(`\n✅ output.json generated with ${result.length} channels`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
