const fs = require("fs");

const INPUT_FILE = "https://raw.githubusercontent.com/vaathala00/jo/main/stream.json";
const OUTPUT_FILE = "output.json";

const DASH_PROXY = "https://dash.vodep39240327.workers.dev/?url=";
const LOGO_BASE =
  "https://jiotv.catchup.cdn.jio.com/dare_images/images/";

const raw = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

const result = Object.entries(raw).map(([id, data]) => {
  const { kid, key, url } = data;

  // Extract channel name from URL
  // /bpk-tv/Star_Vijay_HD_BTS/output/index.mpd
  let name = url.split("/bpk-tv/")[1].split("/")[0];
  name = name.replace("_BTS", "");

  // Extract cookie if present
  const cookieMatch = url.match(/__hdnea__=([^&]+)/);
  const cookie = cookieMatch ? `__hdnea__=${cookieMatch[1]}` : "";

  const finalUrl =
    `${url.split("?")[0]}` +
    `?name=${encodeURIComponent(name.replace(/_/g, " "))}` +
    `&keyId=${kid}` +
    `&key=${key}` +
    (cookie ? `&cookie=${cookie}` : "");

  return {
    name,
    id,
    logo: `${LOGO_BASE}${name}.png`,
    group: "Jio+",
    link: DASH_PROXY + finalUrl
  };
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 4));
console.log("✅ output.json generated");
