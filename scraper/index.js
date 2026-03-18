import fs from "fs";

const INPUT_URL =
  "https://raw.githubusercontent.com/vaathala00/jo/main/stream.json";

const OUTPUT_FILE = "output.json";

const DASH_PROXY = "https://dash.vodep39240327.workers.dev/?url=";

async function main() {
  console.log("📥 Fetching remote stream.json...");

  const res = await fetch(INPUT_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${res.status}`);
  }

  const raw = await res.json();

  const result = Object.entries(raw).map(([id, data]) => {
    const { kid, key, url, group_title, tvg_logo, channel_name } = data;

    // Name used ONLY for the stream URL parameter (e.g., CNBC_Tv18_Prime_HD)
    let rawName = url.split("/bpk-tv/")[1].split("/")[0];
    rawName = rawName.replace("_BTS", "");

    // Display name comes directly from the JSON 'channel_name' field
    const displayName = channel_name || rawName.replace(/_/g, " ");

    // Extract cookie
    const cookieMatch = url.match(/__hdnea__=([^&]+)/);
    const cookie = cookieMatch ? `__hdnea__=${cookieMatch[1]}` : "";

    const finalUrl =
      `${url.split("?")[0]}` +
      `?name=${encodeURIComponent(rawName)}` +
      `&keyId=${kid}` +
      `&key=${key}` +
      (cookie ? `&cookie=${cookie}` : "");

    return {
      name: displayName,
      id,
      logo: tvg_logo,      // Use logo URL from JSON
      group: group_title,  // Use group title from JSON
      link: DASH_PROXY + finalUrl
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 4));
  console.log("✅ output.json generated successfully");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});