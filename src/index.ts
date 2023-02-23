import { config } from "dotenv";
config();

import send from "./send.js";
import id from "./id.js";
(async () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  console.log("Snowblind started!");

  // Send initial message
  const [ snowflake, date ] = await send();
  id.register(snowflake, date);

  while (true) {
    await sleep(1500);

    const [ snowflake, date ] = await send(id.predict());
    id.register(snowflake, date);
  }
})();