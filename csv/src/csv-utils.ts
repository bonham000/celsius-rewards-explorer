import BigNumber from "bignumber.js";
import { CoinDataMap, CelsiusRewardsMetrics, PortfolioEntry } from "./types";

/** ===========================================================================
 * Parse CSV Row Logic
 * ============================================================================
 */

/**
 * Define metrics object which tracks all of the CSV data.
 */
export const getInitialDefaultGlobalStateValues = () => {
  const metrics: CelsiusRewardsMetrics = {
    portfolio: {},
    coinDistributions: {},
    coinDistributionsLevels: {},
    interestEarnedRankings: {
      topOne: "0",
      topTen: "0",
      topHundred: "0",
      topThousand: "0",
      topTenThousand: "0",
    },
    loyaltyTierSummary: {
      platinum: "0",
      gold: "0",
      silver: "0",
      bronze: "0",
      none: "0",
    },
    stats: {
      totalUsers: "0",
      totalUsersEarningInCel: "0",
      maximumPortfolioSize: "0",
      totalInterestPaidInUsd: "0",
      averageNumberOfCoinsPerUser: "0",
      totalPortfolioCoinPositions: "0",
      maxInterestEarned: "0",
      averageInterestPerUser: "0",
    },
  };

  const interestEarnedPerUserList: string[] = [];

  return { metrics, interestEarnedPerUserList };
};

/**
 * Preprocess the CSV row and extract the uuid and the JSON string
 * of rewards data.
 */
export const preprocessCsvRow = (
  line: string,
): { uuid: string; data: CoinDataMap } | null => {
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
  if (uuid === "id") {
    return null;
  }

  json = text.slice(index + 1);
  data = JSON.parse(json);

  return { uuid, data };
};

/**
 * Handle processing an individual CSV row of data.
 */
export const processIndividualUserRewardsRecord = (
  uuid: string,
  rewardsData: CoinDataMap,
  metrics: CelsiusRewardsMetrics,
  interestEarnedPerUserList: string[],
) => {
  let tier = "";
  let isEarningInCel = false;

  let interestPerUser = "0";

  // Process the row data and update all the values we want to track
  for (let [coin, data] of Object.entries(rewardsData)) {
    // Get loyalty tier
    tier = data.loyaltyTier.title;
    let interestCoin = data.interestCoin;

    // Add to the interest this user has earned
    interestPerUser = new BigNumber(data.totalInterestInUsd)
      .plus(interestPerUser)
      .toString();

    // Convert troublesome coin symbols
    if (coin === "USDT ERC20") {
      coin = "USDT";
    } else if (coin === "MCDAI") {
      coin = "DAI";
    }

    // Convert troublesome coin symbols
    if (interestCoin === "USDT ERC20") {
      interestCoin = "USDT";
    } else if (interestCoin === "MCDAI") {
      interestCoin = "DAI";
    }

    // Initialize all values to zero
    let existingTotal = new BigNumber("0");
    let totalEarnInCEL = new BigNumber("0");
    let totalInterestInCoin = new BigNumber("0");
    let totalInterestInUsd = new BigNumber("0");
    let numberOfUsersHolding = new BigNumber("0");

    const defaultValues: PortfolioEntry = {
      total: "0",
      totalEarnInCEL: "0",
      totalInterestInCoin: "0",
      totalInterestInUsd: "0",
      numberOfUsersHolding: "0",
    };

    // Initialize coin distribution if it does not exist yet
    if (!(coin in metrics.coinDistributions)) {
      metrics.coinDistributions[coin] = [];
    }

    // Re-initialize to current value if coin already exists in metrics
    if (coin in metrics.portfolio) {
      const entry = metrics.portfolio[coin];
      existingTotal = new BigNumber(entry.total);
      totalEarnInCEL = new BigNumber(entry.totalEarnInCEL);
      numberOfUsersHolding = new BigNumber(entry.numberOfUsersHolding);
    } else {
      metrics.portfolio[coin] = defaultValues;
    }

    // Differentiate interest coin from portfolio coin
    if (interestCoin in metrics.portfolio) {
      const entry = metrics.portfolio[interestCoin];
      totalInterestInCoin = new BigNumber(entry.totalInterestInCoin);
      totalInterestInUsd = new BigNumber(entry.totalInterestInUsd);
    } else {
      metrics.portfolio[interestCoin] = defaultValues;
    }

    // Add existing coin data to current values
    const distribution = data.distributionData;
    const currentBalance = distribution[distribution.length - 1].newBalance;
    const total = existingTotal.plus(currentBalance);
    totalInterestInCoin = totalInterestInCoin.plus(data.totalInterestInCoin);
    totalInterestInUsd = totalInterestInUsd.plus(data.totalInterestInUsd);
    numberOfUsersHolding = numberOfUsersHolding.plus(1);

    // Add balance to the corresponding coin distribution
    metrics.coinDistributions[coin].push([uuid, currentBalance]);

    // Increment earningInterestInCel value
    const shouldIncrementEarnInCelCount =
      data.earningInterestInCel || interestCoin === "CEL";

    if (shouldIncrementEarnInCelCount) {
      totalEarnInCEL = totalEarnInCEL.plus(1);

      // Only flip isEarningInCel to true, not back to false if it is already
      // true. It's a bit subjective how this value is determined, e.g. a user
      // may earn in CEL on BTC but not on ETH. So... they still choose to
      // earn in CEL.
      if (isEarningInCel === false) {
        isEarningInCel = true;
      }
    }

    // Update coin in portfolio metrics total
    const existingCoin = metrics.portfolio[coin];
    metrics.portfolio[coin] = {
      ...existingCoin,
      total: total.toString(),
      totalEarnInCEL: totalEarnInCEL.toString(),
      numberOfUsersHolding: numberOfUsersHolding.toString(),
    };

    // Update interest coin in portfolio metrics total
    const existingInterestCoin = metrics.portfolio[interestCoin];
    metrics.portfolio[interestCoin] = {
      ...existingInterestCoin,
      totalInterestInUsd: totalInterestInUsd.toString(),
      totalInterestInCoin: totalInterestInCoin.toString(),
    };

    // Increment total interest paid in USD metric
    const totalInterestPaidInUsd = metrics.stats.totalInterestPaidInUsd;
    const totalInterest = new BigNumber(data.totalInterestInUsd)
      .plus(totalInterestPaidInUsd)
      .toString();
    metrics.stats.totalInterestPaidInUsd = totalInterest;
  }

  // Add the current user's interest to the list of all user's interest
  interestEarnedPerUserList.push(interestPerUser);

  // Increment the total user count
  const currentMaxInterest = metrics.stats.maxInterestEarned;
  const maxInterest = Math.max(
    parseFloat(interestPerUser),
    parseFloat(currentMaxInterest),
  );
  metrics.stats.maxInterestEarned = String(maxInterest);

  // Increment the total user count
  metrics.stats.totalUsers = new BigNumber(metrics.stats.totalUsers)
    .plus(1)
    .toString();

  // Increment the total portfolio coin positions by the number
  // of coins in this row
  metrics.stats.totalPortfolioCoinPositions = new BigNumber(
    metrics.stats.totalPortfolioCoinPositions,
  )
    .plus(Object.keys(rewardsData).length)
    .toString();

  // Determine maximum portfolio size
  const currentMax = new BigNumber(
    metrics.stats.maximumPortfolioSize,
  ).toNumber();

  const currentSize = Object.keys(rewardsData).length;
  const newMax = Math.max(currentMax, currentSize);
  metrics.stats.maximumPortfolioSize = String(newMax);

  /**
   * If the current user is earning in CEL (i.e. earningInterestInCel is true
   * or they have CEL earning CEL), increment the totalUsersEarningInCel
   * count.
   */
  if (isEarningInCel) {
    metrics.stats.totalUsersEarningInCel = new BigNumber(
      metrics.stats.totalUsersEarningInCel,
    )
      .plus(1)
      .toString();
  }

  const tierKey = tier.toLowerCase();

  // Increment loyalty tier count
  if (tierKey in metrics.loyaltyTierSummary) {
    metrics.loyaltyTierSummary[tierKey] = new BigNumber(
      metrics.loyaltyTierSummary[tierKey],
    )
      .plus(1)
      .toString();
  } else {
    console.warn(`Unexpected loyalty tier title found: ${tier}`);
  }
};

/**
 * Perform summary logic once all the CSV rows have been processed.
 */
export const onLineReaderClose = (
  metrics: CelsiusRewardsMetrics,
  interestEarnedPerUserList: string[],
) => {
  // Calculate average coins held per user
  const averageNumberOfCoinsPerUser = new BigNumber(
    metrics.stats.totalPortfolioCoinPositions,
  ).dividedBy(metrics.stats.totalUsers);

  metrics.stats.averageNumberOfCoinsPerUser =
    averageNumberOfCoinsPerUser.toString();

  const levels = [
    [0, "topOne"],
    [10, "topTen"], // Off by 1... should by 9? ... erhm, umm...?
    [100, "topHundred"],
    [1000, "topThousand"],
    [10000, "topTenThousand"],
  ];

  // Sort the coin distributions in place to update them, and then take
  // the top holders only
  for (const [coin, values] of Object.entries(metrics.coinDistributions)) {
    // NOTE: Use parseFloat for these sort comparisons is much faster than
    // converted the values back using BigNumber and comparing them that way.
    const sortedValues = values.sort(
      (a, b) => parseFloat(b[1]) - parseFloat(a[1]),
    );

    const distributionLevels = {
      topOne: "0",
      topTen: "0",
      topHundred: "0",
      topThousand: "0",
      topTenThousand: "0",
    };

    // Determine the balance held at each level for this coin
    for (const level of levels) {
      const [index, key] = level;
      const value = sortedValues[index];
      if (value !== undefined) {
        distributionLevels[key] = value[1];
      }
    }

    // Sort the interest earned list
    const sortedInterestList = interestEarnedPerUserList.sort(
      (a, b) => parseFloat(b) - parseFloat(a),
    );

    // Fill in the interest earned rankings
    for (const level of levels) {
      const [index, key] = level;
      const value = sortedInterestList[index];
      if (value !== undefined) {
        metrics.interestEarnedRankings[key] = value;
      }
    }

    const { totalUsers, totalInterestPaidInUsd } = metrics.stats;

    // Compute average interest paid per user
    const averageInterest = new BigNumber(totalInterestPaidInUsd)
      .dividedBy(totalUsers)
      .toString();
    metrics.stats.averageInterestPerUser = averageInterest;

    // Set the distribution levels on the metrics object
    metrics.coinDistributionsLevels[coin] = distributionLevels;

    // Take only the top 100. There are too many holders and the top 1-3
    // whales skew the entire list anyway.
    const TOP_HOLDERS_LIMIT = 100;

    metrics.coinDistributions[coin] = sortedValues.slice(0, TOP_HOLDERS_LIMIT);
  }
};
