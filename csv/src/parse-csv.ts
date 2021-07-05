import BigNumber from "bignumber.js";
import fs from "fs";
import readline from "readline";
import {
  CelsiusRewardsMetrics,
  CoinDataMap,
  parseCelsiusRewardsData,
} from "./utils";

/**
 * Increment the identifier when adding a future CSV file.
 *
 * NOTE: This DATE_IDENTIFIER is used to identify the CSV which is currently
 * being processed. The CSV files each represent a week's worth of rewards
 * and the idea here is to just increment them as the move into the future,
 * e.g. the next week would have an identifier of "02". This identifier
 * is used to identify the original CSV rewards file and the output file,
 * which the app uses and maps to a specific data range (which must be
 * manually entered).
 *
 * "01" corresponds to the first week's data set, which is from June 18 -15.
 * This value simply increments for future weeks, e.g. the next (2nd) week
 * would correspond to "02". After updating the DATE_IDENTIFIER here and
 * building the output dataset, you would need to add the new data range
 * to the Main.tsx app file and import the new dataset there.
 *
 *  See the README for more instructions.
 */
const DATE_IDENTIFIER = "01";
const input = `csv/original-csv-data/${DATE_IDENTIFIER}-rewards.csv`;
const output = `./src/data/${DATE_IDENTIFIER}-rewards.json`;
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
 * Run with the debug flag to run in debug mode, i.e. yarn csv:debug
 */
let debug = false;

// Override with command line flag
const debugFlag = process.argv[2] === "debug";
debug = debugFlag;

let count = 0;
const max = 50;
const debugOutput = {};

/**
 * Modify this function to apply custom logic when processing the CSV
 * records which will be dumped to the debug output JSON file upon
 * completion.
 *
 * This method is give the uuid of a row, the corresponding row data,
 * and the debugOutput object you can write data to. This object will
 * later be written into the JSON file.
 */
const customDebugMethod = (
  uuid: string,
  data: CoinDataMap,
  debugOutput: any,
) => {
  // Add any other custom transformations you want here
  debugOutput[uuid] = data;
};

/** ===========================================================================
 * Process the CSV
 * ============================================================================
 */

// Define metrics object which tracks all of the CSV data
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

const processCSV = (): void => {
  if (debug) {
    console.log("- [NOTE]: Running in debug mode.");
  }

  console.log("- Processing CSV file... Please wait a moment.");

  // Process CSV line by line
  lineReaderInterface.on("line", (line) => {
    const text = line;
    let index = 0;

    // Find the first comma to extract the uuid
    // Although they are all probably the same length...
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ",") {
        index = i;
        break;
      }
    }

    const uuid = text.slice(0, index);
    let json;
    let data: CoinDataMap;

    // Skip header row
    if (uuid !== "id") {
      return;
    }

    // Exit early if debug is enabled
    if (debug) {
      count++;
      customDebugMethod(uuid, data, debugOutput);
      if (count === max) {
        // Write debug file data to JSON
        writeJSON(debugOutput, debugFile);
        lineReaderInterface.close();
      }
    } else {
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
  });

  lineReaderInterface.on("close", () => {
    // Exit early if debug is enabled
    if (debug) {
      console.log(
        `- Exiting early from DEBUG mode - will not update rewards output file: ${output}`,
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

processCSV();
