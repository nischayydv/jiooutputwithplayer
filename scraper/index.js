import fs from "fs";

const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
};

/**
 * Parse Set-Cookie header into a simple key=value string
 */
function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  return setCookieHeader.split(";")[0].trim();
}

/**
 * Fetches decryption key (kid + k) from key endpoint.
 * kid="https" + key="//elitebeam.shop/Jtv/keys.php?id" + "=" + channelId
 * => https://elitebeam.shop/Jtv/keys.php?id=143
 */
async function fetchKey(kidScheme, keyPath, channelId) {
  const keyUrl = `${kidScheme}:${keyPath}=${channelId}`;
  try {
    const res = await fetch(keyUrl, {
      redirect: "follow",
      headers: HEADERS,
    });

    if (!res.ok) {
      console.warn(`⚠️  Key fetch failed for id=${channelId} [${res.status}]`);
      return { kid: null, k: null, cookie: null };
    }

    const setCookie = res.headers.get("set-cookie") || null;
    const headerCookie = parseCookie(setCookie);

    const json = await res.json();
    const keyObj = json?.keys?.[0];

    // Some APIs return cookie directly in JSON body
    const bodyCookie = json?.cookie ?? json?.hdnea ?? null;

    return {
      kid:    keyObj?.kid ?? null,
      k:      keyObj?.k   ?? null,
      cookie: bodyCookie || headerCookie || null,
    };
  } catch (err) {
    console.warn(`⚠️  Key fetch error for id=${channelId}: ${err.message}`);
    return { kid: null, k: null, cookie: null };
  }
}

/**
 * Resolves final MPD URL after any redirects.
 * Also captures any Set-Cookie headers (e.g. __hdnea__) from the MPD server.
 */
async function resolveMpdUrl(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: HEADERS,
    });

    const setCookie = res.headers.get("set-cookie") || null;
    const cookie = parseCookie(setCookie);

    const finalUrl = res.url || url;

    // Also check for __hdnea__ embedded in the final URL
    const hdneaMatch = finalUrl.match(/__hdnea__=([^&]+)/);
    const hdnea = hdneaMatch ? `__hdnea__=${hdneaMatch[1]}` : null;

    return {
      finalUrl,
      cookie: hdnea || cookie || null,
    };
  } catch (err) {
    console.warn(`⚠️  MPD resolve error: ${err.message}`);
    return { finalUrl: url, cookie: null };
  }
}

async function main() {
  console.log("📥 Fetching remote stream.json...");

  const res = await fetch(INPUT_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);

  const raw = await res.json();
  const entries = Object.entries(raw);

  console.log(`🔄 Processing ${entries.length} channels...\n`);

  const results = await Promise.all(
    entries.map(async ([id, data]) => {
      const {
        kid,
        key,
        url,
        group_title,
        tvg_logo,
        channel_name,
      } = data;

      // 1. Resolve MPD URL + grab any cookie from MPD server
      const { finalUrl: mpdUrl, cookie: mpdCookie } = await resolveMpdUrl(url);

      // 2. Fetch decryption keys + grab any cookie from key server
      const { kid: realKid, k: realKey, cookie: keyCookie } = await fetchKey(kid, key, id);

      // 3. Best cookie (priority: MPD server > key server)
      const cookie = mpdCookie || keyCookie || null;

      // 4. Build proxied URL
      const [baseUrl, queryString] = mpdUrl.split("?");
      const existingParams = queryString ? `&${queryString}` : "";

      const proxiedUrl =
        `${baseUrl}` +
        `?name=${encodeURIComponent(channel_name || id)}` +
        `&keyId=${encodeURIComponent(realKid || "")}` +
        `&key=${encodeURIComponent(realKey || "")}` +
        (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "") +
        existingParams;

      const status = realKid ? "✅" : "⚠️ (no key)";
      console.log(`  ${status} [${id}] ${channel_name} | kid: ${realKid ?? "—"} | cookie: ${cookie ?? "none"}`);

      return {
        name:  channel_name || String(id),
        id,
        logo:  tvg_logo    || "",
        group: group_title  || "Uncategorized",
        link:  DASH_PROXY + encodeURIComponent(proxiedUrl),
      };
    })
  );

  const filtered = results.filter(Boolean);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filtered, null, 4));
  console.log(`\n✅  output.json written with ${filtered.length} channels`);
}

main().catch(err => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
