import fs from "fs";
import readline from "readline";
import { CoinDataMap } from "./types";
import {
  getInitialDefaultGlobalStateValues,
  onLineReaderClose,
  preprocessCsvRow,
  processIndividualUserRewardsRecord,
} from "./csv-utils";

// Read command arguments
const commandArgument = process.argv[2];

const runAll = commandArgument === "all";

if (runAll) {
  console.log("- [NOTE]: Processing all CSV files.\n");
}

const CSV_KEYS = fs.readdirSync("csv/original-csv-data").map((file) => {
  return file.slice(0, 2);
});

// Current date identifier is the last entry in the list
let DATE_IDENTIFIER = CSV_KEYS.pop();

const getFileNames = (identifier: string) => {
  const inputFile = `csv/original-csv-data/${identifier}-rewards.csv`;
  const outputFile = `./src/data/${identifier}-rewards.json`;

  return {
    inputFile,
    outputFile,
  };
};

const debugFile = "./csv/debug/debug-output.json";
const debugMeticsFile = "./csv/debug/rewards-metrics.json";

// Create the debug output directory if it doesn't exist yet
if (!fs.existsSync("csv/debug")) {
  fs.mkdirSync("csv/debug");
}

// Write resulting data to JSON files
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
debug = commandArgument === "debug";

let count = 0;
const max = 100;
const debugOutput = {};

if (debug) {
  console.log(
    `- [NOTE]: Running in debug mode. Processing rows from ${count} to ${max}.\n`,
  );
}

/**
 * Modify this function to apply custom logic when processing the CSV
 * records which will be dumped to the debug output JSON file upon
 * completion.
 *
 * This method is give the uuid of a row, the corresponding row data,
 * and the debugOutput object you can write data to. This object will
 * later be written into the JSON file.
 *
 * Some examples of what you can do are in the method body.
 */
const customDebugMethod = (
  uuid: string,
  data: CoinDataMap,
  debugOutput: any,
) => {
  // e.g. record a user with a specific uuid
  if (uuid === "<custom-uuid>") {
    // Add any other custom transformations you want here
    debugOutput[uuid] = data;
  }

  // or just record all uuids
  debugOutput[uuid] = data;
};

/** ===========================================================================
 * Process the CSV
 * ============================================================================
 */

const main = (csvFileKey: string): void => {
  // Initialize a new metrics object for tallying up the results
  const state = getInitialDefaultGlobalStateValues();
  const { metrics, interestEarnedPerUserList } = state;
  const { inputFile, outputFile } = getFileNames(csvFileKey);

  // Read the CSV data using the NodeJS stream interface
  const lineReaderInterface = readline.createInterface({
    input: require("fs").createReadStream(inputFile),
  });

  console.log(`- Processing CSV file: ${inputFile} ... Please wait a moment.`);

  let COUNT = 0;

  // Process CSV line by line
  lineReaderInterface.on("line", (line) => {
    const result = preprocessCsvRow(line);

    if (result === null) {
      return;
    }

    const { uuid, data } = result;

    COUNT++;

    // Process the rest of the row data
    processIndividualUserRewardsRecord(
      uuid,
      data,
      metrics,
      interestEarnedPerUserList,
    );

    // Exit early if debug is enabled
    if (debug) {
      count++;
      customDebugMethod(uuid, data, debugOutput);
      if (count === max) {
        // Write debug file data to JSON
        writeJSON(debugOutput, debugFile);
        lineReaderInterface.close();
      }
    }
  });

  /**
   * On close, some summary metrics are recorded and then the resulting
   * data is written to files as JSON.
   */
  lineReaderInterface.on("close", () => {
    console.log(
      "- Finished processing row data. Now working on some summary stats.",
    );

    console.log(`COUNTED: ${COUNT} ROWS`);

    // Running summary logic on reader close
    onLineReaderClose(metrics, interestEarnedPerUserList);

    console.log("- Data processed. Ready to save the results.");

    if (debug) {
      // Save custom debug output
      writeJSON(debugOutput, debugFile);
      // Save metrics to debug metrics file
      writeJSON(metrics, debugMeticsFile);
    } else {
      writeJSON(metrics, outputFile);
    }

    if (runAll) {
      if (CSV_KEYS.length > 0) {
        const next = CSV_KEYS.pop();
        console.log(
          `\n- Completed processing ${inputFile}, moving on to next file key: ${next}.`,
        );
        main(next);
      } else {
        console.log("\n- All files processed. Exiting.\n");
      }
    }
  });
};

// Run the script
main(DATE_IDENTIFIER);
