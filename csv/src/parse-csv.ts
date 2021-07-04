import fs from "fs";
import readline from "readline";
import {
  CelsiusRewardsMetrics,
  CoinDataMap,
  parseCelsiusRewardsData,
} from "./utils";

const filename = "csv/rewards.csv";

const lineReaderInterface = readline.createInterface({
  input: require("fs").createReadStream(filename),
});

const writeJSON = (data: any) => {
  console.log("- Done! Writing result to file.");
  const jsonString = JSON.stringify(data, null, 2);
  fs.writeFileSync("./csv/output/rewards.json", jsonString, "utf-8");
};

const debug = false;

const readCSV = () => {
  let count = 0;

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
      totalUsers: 0,
      averageNumberOfCoinsPerUser: 0,
      totalPortfolioCoinPositions: 0,
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

      metrics.stats.totalUsers = metrics.stats.totalUsers + 1;
      metrics.stats.totalPortfolioCoinPositions =
        metrics.stats.totalPortfolioCoinPositions + Object.keys(data).length;

      parseCelsiusRewardsData(data, metrics);
    }

    if (debug) {
      count++;
      if (count === 2) {
        lineReaderInterface.close();
      }
    }
  });

  lineReaderInterface.on("close", () => {
    // Calculate average coins held per user
    const averageNumberOfCoinsPerUser =
      metrics.stats.totalPortfolioCoinPositions / metrics.stats.totalUsers;
    metrics.stats.averageNumberOfCoinsPerUser = averageNumberOfCoinsPerUser;

    // Write resulting data to JSON
    writeJSON(metrics);
  });
};

readCSV();
