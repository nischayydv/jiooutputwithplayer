import fs from "fs";

const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

const CONCURRENCY = 20;        // parallel requests at once
const RETRY_LIMIT = 3;         // retries per failed key fetch
const TIMEOUT_MS = 8000;       // 8s timeout per request

// ─── Fetch with timeout + retry ───────────────────────────────────────────────
async function fetchWithRetry(url, retries = RETRY_LIMIT) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      const isLast = attempt === retries;
      if (isLast) throw err;
      const wait = attempt * 500;
      console.warn(`    ↺ Retry ${attempt}/${retries} for ${url} (${err.message}) — waiting ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ─── Fetch DRM key for one channel ────────────────────────────────────────────
async function fetchDrmKeys(kid, key, channelId) {
  // kid = "https"  key = "//mini.allinonereborn.fun/key/key.php?id"
  // → full URL:  https://mini.allinonereborn.fun/key/key.php?id=143
  const licenseUrl = `${kid}:${key}=${channelId}`;

  try {
    const data = await fetchWithRetry(licenseUrl);

    // Handle both array [ {kid, key} ] and object { kid, key } responses
    const entry = Array.isArray(data) ? data[0] : data;

    return {
      keyId:      entry?.kid          || entry?.key_id       || "",
      decryptKey: entry?.key          || entry?.decrypt_key  || "",
      raw: entry
    };
  } catch (err) {
    console.warn(`  ⚠️  Key fetch failed id=${channelId}: ${err.message}`);
    return { keyId: "", decryptKey: "", raw: null };
  }
}

// ─── Process a batch of channels in parallel ──────────────────────────────────
async function processBatch(batch) {
  return Promise.all(
    batch.map(async ([id, channel]) => {
      const { kid, key, url, group_title, tvg_logo, channel_name } = channel;

      const [mpdUrl, queryString] = url.split("?");

      const hdneaMatch = queryString?.match(/(__hdnea__=[^&]+)/);
      const cookie = hdneaMatch ? hdneaMatch[1] : "";

      const bpkMatch = mpdUrl.match(/\/bpk-tv\/([^/]+)\//);
      let rawName = bpkMatch ? bpkMatch[1] : String(id);
      rawName = rawName.replace(/_BTS|_MOB/g, "");

      const displayName = channel_name || rawName.replace(/_/g, " ");

      const { keyId, decryptKey } = await fetchDrmKeys(kid, key, id);

      const playerUrl =
        DASH_PROXY +
        encodeURIComponent(mpdUrl) +
        `&keyId=${encodeURIComponent(keyId)}` +
        `&key=${encodeURIComponent(decryptKey)}` +
        (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "");

      const status = keyId ? "✅" : "⚠️ ";
      console.log(`  ${status} [${id}] ${displayName} | keyId: ${keyId || "MISSING"}`);

      return {
        name: displayName,
        id,
        logo: tvg_logo,
        group: group_title,
        link: playerUrl,
        ...(keyId ? {} : { _keyMissing: true })
      };
    })
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log("📥 Fetching remote stream.json...");

  const res = await fetch(INPUT_URL);
  if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);

  const raw = await res.json();
  const channels = Object.entries(raw).filter(([id, ch]) => {
    if (!ch.url) { console.warn(`⚠️  Skipping id=${id} — no url`); return false; }
    return true;
  });

  console.log(`🔄 Processing ${channels.length} channels (concurrency: ${CONCURRENCY})...\n`);

  // Split into chunks of CONCURRENCY and process each chunk
  const results = [];
  for (let i = 0; i < channels.length; i += CONCURRENCY) {
    const batch = channels.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(channels.length / CONCURRENCY);
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (channels ${i + 1}–${Math.min(i + CONCURRENCY, channels.length)})`);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
  }

  const missing = results.filter(r => r._keyMissing).length;
  // Remove internal flag before saving
  const clean = results.map(({ _keyMissing, ...rest }) => rest);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(clean, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s — ${clean.length} channels written to ${OUTPUT_FILE}`);
  if (missing > 0) console.warn(`⚠️  ${missing} channels had missing keys`);
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
