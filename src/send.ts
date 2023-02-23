import fetch from "node-fetch";

const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/110.0";
const superProp = {
  "os": "Linux",
  "browser": "Firefox",
  "device": "",
  "system_locale": "en-US",
  "browser_user_agent": ua, 
  "browser_version": "110.0",
  "os_version": "",
  "referrer": "",
  "referring_domain": "",
  "referrer_current": "",
  "referring_domain_current": "",
  "release_channel": "stable",
  "client_build_number": 175627,
  "client_event_source": null,
  "design_id": 0
}

export default async function send(snowflake?: bigint): Promise<[bigint, number]> {
  const channel = process.env.CHANNEL!;
  const guild = process.env.GUILD!;

  const content = `https://discord.com/channels/${guild}/${channel}/${snowflake ?? getNonce()}`;
  const body = JSON.stringify({
    content,
    flags: 4096, // 4096 = @silent
    nonce: getNonce(),
    tts: false,
  });

  // Send the message
  const date = Date.now();
  const url = `https://discord.com/api/v9/channels/${channel}/messages`;
  const request = await fetch(url, {
    method: "POST",
    body,
    headers: {
      "Accept": "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US",
      "Authorization": process.env.TOKEN!,
      "Content": "keep-alive",
      "Content-Length": body.length.toString(),
      "Content-Type": "application/json",
      "Host": "discord.com",
      "Origin": "https://discord.com",
      "Referer": `https://discord.com/channels/${guild}/${channel}`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "TE": "trailers",
      "User-Agent": ua,
      "X-Debug-Options": "bugReporterEnabled",
      "X-Discord-Locale": "en-US",
      "X-Discord-Properties": Buffer.from(JSON.stringify(superProp)).toString("base64"),
    }
  });

  // Discord doesn't like us
  if (!request.ok) {
    console.log(`Error: ${request.status} ${request.statusText}`);
    await new Promise(resolve => setTimeout(resolve, request.status === 429 ? 5000 : 1500));
    return await send(snowflake);
  }
  
  const response = await request.json() as any;
  return [BigInt(response.id), date];
}

// Get a random nonce (snowflake only with timestamp)
function getNonce(): string {
  const now = BigInt(Date.now() - 1420070400000);
  const snowflake = now << 22n;
  return snowflake.toString();
}