import BigNumber from "bignumber.js";
import fs from "fs";
import readline from "readline";
import {
  CelsiusRewardsMetrics,
  CoinDataMap,
  parseCelsiusRewardsData,
} from "./utils";

const filename = "csv/original-csv-data/rewards.csv";
const output = "./csv/output/rewards-metrics.json";

const lineReaderInterface = readline.createInterface({
  input: require("fs").createReadStream(filename),
});

const writeJSON = (data: any) => {
  console.log("- Done! Writing result to file.");
  const jsonString = JSON.stringify(data, null, 2);
  fs.writeFileSync(output, jsonString, "utf-8");
};

// Toggle debug mode on/off
let debug = false;
// debug = true;
let count = 0;
const max = 10;

const readCSV = () => {
  const metrics: CelsiusRewardsMetrics = {
    portfolio: {},
    loyaltyTierSummary: {
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      none: 0,
    },
    stats: {
      totalUsers: "0",
      totalInterestPaidInUsd: "0",
      averageNumberOfCoinsPerUser: "0",
      totalPortfolioCoinPositions: "0",
    },
  };

  console.log("- Processing CSV file...");

  lineReaderInterface.on("line", (line) => {
    const text = line;
    let index = 0;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === ",") {
        index = i;
        break;
      }
    }

    const uuid = text.slice(0, index);

    // Ignore header row
    if (uuid !== "id") {
      const json = text.slice(index + 1);
      const data: CoinDataMap = JSON.parse(json);

      metrics.stats.totalUsers = new BigNumber(metrics.stats.totalUsers)
        .plus(1)
        .toString();

      metrics.stats.totalPortfolioCoinPositions = new BigNumber(
        metrics.stats.totalPortfolioCoinPositions,
      )
        .plus(Object.keys(data).length)
        .toString();

      parseCelsiusRewardsData(data, metrics);
    }

    if (debug) {
      count++;
      if (count === max) {
        lineReaderInterface.close();
      }
    }
  });

  lineReaderInterface.on("close", () => {
    // Calculate average coins held per user
    const averageNumberOfCoinsPerUser = new BigNumber(
      metrics.stats.totalPortfolioCoinPositions,
    ).dividedBy(metrics.stats.totalUsers);
    metrics.stats.averageNumberOfCoinsPerUser =
      averageNumberOfCoinsPerUser.toString();

    // Write resulting data to JSON
    writeJSON(metrics);
  });
};

readCSV();
