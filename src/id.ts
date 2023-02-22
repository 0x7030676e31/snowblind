import fs from "fs";

let lastWorker: bigint = 0n;
let lastProcess: number = 0;
let lastIncrement: number = 0;

const avgTimestamp: number[] = [];
const avgIncrement: number[] = [];

if (!fs.existsSync("incr.json")) fs.writeFileSync("incr.json", "{}");
const incrData: { [key: string]: number } = JSON.parse(fs.readFileSync("incr.json", "utf8"));

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
    lastProcess = a3;
    lastIncrement = a4;

    // Save the diff in timestamp
    const delatT = date - (a1 + Number(epoch));
    avgTimestamp.push(delatT);
    if (avgTimestamp.length > 10) avgTimestamp.shift();
    
    // Save the diff in incremental value
    avgIncrement.push(Number(lastIncrement));
    if (avgIncrement.length > 10) avgIncrement.shift();
    
    // Register the last digit of the incremental value
    const incrLast = lastIncrement.toString().at(-1)!;
    if (!incrData[incrLast]) incrData[incrLast] = 0;
    incrData[incrLast]++;
    
    // Save the data
    fs.writeFileSync("incr.json", JSON.stringify(incrData, null, 2));
    if (predictedSnowflake) fs.appendFileSync("data.txt", `${fmt1} ${fmt3} ${fmt4}\n`);
  },
  
  // Try to predict the next snowflake based on the previous snowflakes
  predict: function (): bigint {
    // Predict timestamp
    const timestamp = BigInt(Date.now()) - epoch - BigInt(Math.floor(avg(avgTimestamp)));

    // Predict process
    let process: bigint;
    if (lastIncrement <= 30n) process = BigInt(lastProcess);
    else process = BigInt(Math.floor(Math.random() * 6));

    // Predict increment
    const tens = Math.floor(avg(avgIncrement) / 10) * 10 + ((Math.floor(Math.random() * 10 % 6) + 1) * 10 - 30)
    const increment = BigInt(Math.abs(tens) + getIncrDigit()); 

    // Generate snowflake
    const snowflake = (timestamp << 22n) | (lastWorker << 17n) | (process << 12n) | increment;
    predictedSnowflake = snowflake;
    return snowflake;
  }
}

// Get a random digit based on the frequency of the last digit of the incremental value
function getIncrDigit(): number {
  const entries = Object.entries(incrData);
  const max = entries.reduce((a, b) => a + b[1], 0);
  const ratios = entries.map((e) => e[1] / max);

  const rand = Math.random();
  let cumulative = 0;

  for (const i in ratios) {
    cumulative += ratios[+i];
    if (rand < cumulative) return Number(entries[+i][0]);
  }

  // Something went wrong
  console.log(cumulative, ratios, rand, incrData);
  return 0;
}

// Get the average of an array
function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length || 0;
}
