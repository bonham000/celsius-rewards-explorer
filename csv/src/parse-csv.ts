import BigNumber from "bignumber.js";
import fs from "fs";
import readline from "readline";
import {
  CelsiusRewardsMetrics,
  CoinDataMap,
  parseCelsiusRewardsData,
} from "./utils";

// Increment the identifier when adding a future CSV file
const identifier = "01";
const input = "csv/original-csv-data/rewards.csv";
const output = `./src/data/${identifier}-rewards.json`;
const debugFile = "./csv/output/debug.json";

const lineReaderInterface = readline.createInterface({
  input: require("fs").createReadStream(input),
});

const writeJSON = (data: any, filename: string) => {
  console.log(`- Done! Writing result to file: ${filename}`);
  const jsonString = JSON.stringify(data, null, 2);
  fs.writeFileSync(filename, jsonString, "utf-8");
};

/**
 * Toggle debug mode on/off.
 *
 * Debug mode reads a limited number of lines from the input CSV file,
 * to make debugging the output easier (the CSV file is very large). Debug
 * mode will read up to the max number of lines, as set by the max value
 * below:
 */
let debug = false;
// debug = true;
let count = 0;
const max = 50;
const debugOutput = {};

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
      maximumPortfolioSize: "0",
      totalInterestPaidInUsd: "0",
      averageNumberOfCoinsPerUser: "0",
      totalPortfolioCoinPositions: "0",
    },
  };

  console.log("- Processing CSV file... Please wait a moment.");

  // Process CSV line by line
  lineReaderInterface.on("line", (line) => {
    const text = line;
    let index = 0;

    // Find the first comma to extract the uuid
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ",") {
        index = i;
        break;
      }
    }

    const uuid = text.slice(0, index);
    let json;
    let data: CoinDataMap;

    // Ignore header row
    if (uuid !== "id") {
      json = text.slice(index + 1);
      data = JSON.parse(json);

      // Increment the total user count
      metrics.stats.totalUsers = new BigNumber(metrics.stats.totalUsers)
        .plus(1)
        .toString();

      // Increment the total portfolio coin positions by the number
      // of coins in this row
      metrics.stats.totalPortfolioCoinPositions = new BigNumber(
        metrics.stats.totalPortfolioCoinPositions,
      )
        .plus(Object.keys(data).length)
        .toString();

      // Determine maximum portfolio size
      const currentMax = new BigNumber(
        metrics.stats.maximumPortfolioSize,
      ).toNumber();
      const currentSize = Object.keys(data).length;
      const newMax = Math.max(currentMax, currentSize);
      metrics.stats.maximumPortfolioSize = String(newMax);

      // Process the rest of the row data
      parseCelsiusRewardsData(data, metrics);
    }

    // Exit early if debug is enabled
    if (debug) {
      count++;
      debugOutput[uuid] = data;
      if (count === max) {
        // Write debug file data to JSON
        writeJSON(debugOutput, debugFile);
        lineReaderInterface.close();
      }
    }
  });

  lineReaderInterface.on("close", () => {
    // Exit early if debug is enabled
    if (debug) {
      console.log(
        `Exiting early in DEBUG mode - will not update rewards output file: ${output}`,
      );
      return;
    }

    // Calculate average coins held per user
    const averageNumberOfCoinsPerUser = new BigNumber(
      metrics.stats.totalPortfolioCoinPositions,
    ).dividedBy(metrics.stats.totalUsers);

    metrics.stats.averageNumberOfCoinsPerUser =
      averageNumberOfCoinsPerUser.toString();

    // Write resulting data to JSON
    writeJSON(metrics, output);
  });
};

readCSV();
