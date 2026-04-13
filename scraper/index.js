const axios = require("axios");
const fs = require("fs");
import fs from "fs";

const STREAM_URL = "https://raw.githubusercontent.com/alex4528x/m3u/refs/heads/main/jtv.m3u";
const OUTPUT_FILE = "stream.json";
const INPUT_URL = "https://raw.githubusercontent.com/nischayydv/jiojson/main/stream.json";
const OUTPUT_FILE = "output.json";
const DASH_PROXY = "https://jioplayer.pages.dev/?url=";

async function fetchAndSaveJson() {
  try {
    const response = await axios.get(STREAM_URL, { responseType: "text" });
    const lines = response.data.split("\n");

    const result = {};

    let currentKid = null;
    let currentKey = null;
    let currentTvgId = null;
    let currentGroup = null;
    let currentLogo = null;
    let currentChannel = null;
    let currentUserAgent = null;

    for (const line of lines) {
      const trimmed = line.trim();
async function main() {
  console.log("📥 Fetching remote stream.json...");
  const res = await fetch(INPUT_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${res.status}`);
  }
  const raw = await res.json();

      // Extract info from #EXTINF
      if (trimmed.startsWith("#EXTINF:")) {
        const tvgIdMatch = trimmed.match(/tvg-id="(\d+)"/);
        const groupMatch = trimmed.match(/group-title="([^"]+)"/);
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
        const channelMatch = trimmed.match(/,(.*)$/);
  const channels = Array.isArray(raw) ? Object.entries({ ...raw }) : Object.entries(raw);
  console.log(`🔄 Processing ${channels.length} channels...`);

        currentTvgId = tvgIdMatch ? tvgIdMatch[1] : null;
        currentGroup = groupMatch ? groupMatch[1] : null;
        currentLogo = logoMatch ? logoMatch[1] : null;
        currentChannel = channelMatch ? channelMatch[1] : null;
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

      // Extract kid and key
      else if (trimmed.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
        const [kid, key] = trimmed.split("=")[1].split(":");
        currentKid = kid;
        currentKey = key;
      }
      // Split MPD base URL and query string
      const [mpdUrl, queryString] = url.split("?");

      // Extract user-agent
      else if (trimmed.startsWith("#EXTVLCOPT:http-user-agent=")) {
        currentUserAgent = trimmed.split("=")[1];
      }
      // Extract __hdnea__ cookie from query string
      const hdneaMatch = queryString ? queryString.match(/(__hdnea__=[^&]+)/) : null;
      const cookie = hdneaMatch ? hdneaMatch[1] : "";

      // Extract URL after license
      else if (currentKid && currentKey && currentTvgId && trimmed.startsWith("http")) {
        // Remove extra &xxx=... if present
        const cleanUrl = trimmed.split("&xxx=")[0];
      // Extract rawName from /bpk-tv/CNBC_Tv18_Prime_HD_BTS/
      const bpkMatch = mpdUrl.match(/\/bpk-tv\/([^/]+)\//);
      let rawName = bpkMatch ? bpkMatch[1] : String(id);
      rawName = rawName.replace("_BTS", "");

        result[currentTvgId] = {
          kid: currentKid,
          key: currentKey,
          url: cleanUrl,
          group_title: currentGroup,
          tvg_logo: currentLogo,
          channel_name: currentChannel,
          user_agent: currentUserAgent
        };
      const displayName = channel_name || rawName.replace(/_/g, " ");

        // Reset for next entry
        currentKid = null;
        currentKey = null;
        currentTvgId = null;
        currentGroup = null;
        currentLogo = null;
        currentChannel = null;
        currentUserAgent = null;
      }
    }
      // kid and key are directly in the JSON — no fetching needed
      const playerUrl =
        DASH_PROXY +
        encodeURIComponent(mpdUrl) +
        `&keyId=${encodeURIComponent(kid)}` +
        `&key=${encodeURIComponent(key)}` +
        (cookie ? `&cookie=${encodeURIComponent(cookie)}` : "");

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
    console.log("✅ stream.json saved successfully.");
      console.log(`  ✅ ${displayName} (id: ${id}) | kid: ${kid}`);

  } catch (err) {
    console.error("❌ Failed to fetch M3U:", err.message);
    process.exit(1);
  }
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

fetchAndSaveJson();
main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
