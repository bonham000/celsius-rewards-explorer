import BigNumber from "bignumber.js";

/** ===========================================================================
 * Types & Config
 * ============================================================================
 */

interface DistributionData {
  type: string;
  dateCoefficient: string;
  date: string;
  value: string;
  newBalance: string;
  originalInterestCoin: null;
  regInterestRateBasis: string;
  regInterestRateAmount: string;
  specInterestRateBasis: string;
  specInterestRateAmount: string;
  totalInterest: string;
  threshold: string;
}

type LOYALTY_TIERS = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "NONE";

interface LoyaltyTier {
  title: LOYALTY_TIERS;
  level: number;
  minimum_cel_percentage: string;
  maximum_cel_percentage: string;
  interest_bonus: string;
  loan_interest_bonus: string;
}

export interface CoinData {
  interestCoin: string;
  totalInterestInCoin: string;
  totalInterestInUsd: string;
  distributionRuleUsed: string;
  interest_on_first_n_coins: string;
  earningInterestInCel: boolean;
  loyaltyTier: LoyaltyTier;
  distributionData: DistributionData[];
  originalInterestCoin: string;
  totalInterestInOriginalInterestCoin: string;
}

export type CoinDataMap = { [coin: string]: CoinData };

interface PortfolioEntry {
  total: string;
  totalEarnInCEL: string;
  totalInterestInCoin: string;
  totalInterestInUsd: string;
  numberOfUsersHolding: string;
}

interface CoinDistributionLevels {
  topOne: string;
  topTen: string;
  topHundred: string;
  topThousand: string;
  topTenThousand: string;
}

type Portfolio = { [coin: string]: PortfolioEntry };

type CoinDistribution = [string, string][];
type CoinDistributions = { [coin: string]: CoinDistribution };
type CoinDistributionLevelsMap = { [coin: string]: CoinDistributionLevels };

interface LoyaltyTierSummary {
  platinum: number;
  gold: number;
  silver: number;
  bronze: number;
  none: number;
}

interface Stats {
  totalUsers: string;
  totalUsersEarningInCel: string;
  maximumPortfolioSize: string;
  averageNumberOfCoinsPerUser: string;
  totalPortfolioCoinPositions: string;
  totalInterestPaidInUsd: string;
  maxInterestEarned: string;
  averageInterestPerUser: string;
}

export interface CelsiusRewardsMetrics {
  portfolio: Portfolio;
  loyaltyTierSummary: LoyaltyTierSummary;
  coinDistributions: CoinDistributions;
  coinDistributionsLevels: CoinDistributionLevelsMap;
  stats: Stats;
}

/** ===========================================================================
 * Parse CSV Row Logic
 * ============================================================================
 */

export const parseCelsiusRewardsData = (
  uuid: string,
  rewardsData: CoinDataMap,
  metrics: CelsiusRewardsMetrics,
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
    metrics.loyaltyTierSummary[tierKey] =
      metrics.loyaltyTierSummary[tierKey] + 1;
  } else {
    console.warn(`Unexpected loyalty tier title found: ${tier}`);
  }
};
