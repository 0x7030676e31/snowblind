import fs from "fs";

let lastWorker: bigint = 0n;

const avgTimestamp: number[] = [];
const avgIncrement: number[] = [];

if (!fs.existsSync("incr.txt")) fs.writeFileSync("incr.txt", "");
const incrOnces: number[] = fs.readFileSync("incr.txt", "utf8").split("").map(Number);
const incrTens: number[] = [];

let predictedSnowflake: bigint = 0n;
const epoch = 1420070400000n;

export default {
  // Extract the timestamp, worker, process and incremental value from a snowflake and save them for later prediction
  register: function (snowflake: bigint, date: number): void {
    // Check if the snowflake is the same as the predicted one
    if (snowflake === predictedSnowflake) {
      const url = `https://discord.com/channels/${process.env.GUILD}/${process.env.CHANNEL}/${snowflake}`;
      console.log(`${url}\nSnowflake is the same as the last one, exiting...`);
      process.exit(0);
    }

    const a1 = Number(snowflake >> 22n);
    const a3 = Number(snowflake & 0x1F000n) >> 12;
    const a4 = Number(snowflake & 0xFFFn);

    const b1 = Number(predictedSnowflake >> 22n);
    const b3 = Number(predictedSnowflake & 0x1F000n) >> 12;
    const b4 = Number(predictedSnowflake & 0xFFFn);
    
    const fmt1 = Math.abs(a1 - b1).toString().padEnd(5, " ");
    const fmt3 = Math.abs(a3 - b3).toString();
    const fmt4 = Math.abs(a4 - b4).toString().padStart(3, " ");
    
    // Save the last snowflake
    lastWorker = (snowflake & 0x3E0000n) >> 17n;

    // Save the diff in timestamp
    const delatT = date - (a1 + Number(epoch));
    avgTimestamp.push(delatT);
    if (avgTimestamp.length > 10) avgTimestamp.shift();
    
    // Save the diff in incremental value
    avgIncrement.push(a4);
    if (avgIncrement.length > 10) avgIncrement.shift();
    
    // Register the last incremental value
    const ones = +a4.toString().at(-1)!;
    const tens = Math.floor(a4 / 10) * 10;

    incrOnces.push(ones);
    incrTens.push(tens);

    if (incrOnces.length > 100) incrOnces.shift();
    if (incrTens.length > 20) incrTens.shift();
    
    // Save the data
    fs.writeFileSync("incr.txt", incrOnces.join(""));
    if (predictedSnowflake) fs.appendFileSync("data.txt", `${fmt1} ${fmt3} ${fmt4}\n`);
  },
  
  // Try to predict the next snowflake based on the previous snowflakes
  predict: function (): bigint {
    // Predict timestamp
    const timestamp = BigInt(Date.now()) - epoch - BigInt(Math.floor(avg(avgTimestamp)));

    // Predict process
    const process = BigInt(Math.floor(Math.random() * 6));

    // Predict increment
    const increment = BigInt(getIncrTens() + getIncrAvg()); 

    // Generate snowflake
    const snowflake = (timestamp << 22n) | (lastWorker << 17n) | (process << 12n) | increment;
    predictedSnowflake = snowflake;
    return snowflake;
  }
}

// Get a random digit based on the frequency of the last digit of the incremental value
function getIncrAvg(): number {
  const obj: { [key: string]: number } = {};
  for (const i of incrOnces) {
    if (obj[i] !== undefined) obj[i]++;
    else obj[i] = 1;
  }

  const entries = Object.entries(obj);
  const max = entries.reduce((a, b) => a + b[1], 0);
  const ratios = entries.map((e) => e[1] / max);

  const rand = Math.random();
  let cumulative = 0;

  for (const i in ratios) {
    cumulative += ratios[+i];
    if (rand < cumulative) return Number(entries[+i][0]);
  }

  // Something went wrong
  console.log(cumulative, ratios, rand, incrOnces);
  return 0;
}

// Get the most common tens digit of the incremental value
function getIncrTens(): number {
  // ==============
  // Still experimenting with this one. So far it's not very accurate.
  // Probably I will do some tests with the data I have and see what works best.
  // ==============


  // const obj = incrTens.reduce((a, b) => {
  //   if (a[b] !== undefined) a[b]++;
  //   else a[b] = 1;
  //   return a;
  // }, {} as { [key: number]: number });

  // const max = Math.max(...Object.values(obj));
  // const arr = Object.entries(obj).filter((e) => e[1] === max).map((e) => Number(e[0]));

  // return arr[Math.floor(Math.random() * arr.length)];
  return Math.floor(incrTens.reduce((a, b) => a + b, 0) / incrTens.length / 10) * 10 || 0;
}

// Get the average of an array
function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length || 0;
}
