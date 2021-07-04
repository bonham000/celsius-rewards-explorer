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

type Portfolio = { [coin: string]: PortfolioEntry };

interface LoyaltyTierSummary {
  platinum: number;
  gold: number;
  silver: number;
  bronze: number;
  none: number;
}

interface Stats {
  totalUsers: string;
  maximumPortfolioSize: string;
  averageNumberOfCoinsPerUser: string;
  totalPortfolioCoinPositions: string;
  totalInterestPaidInUsd: string;
}

export interface CelsiusRewardsMetrics {
  portfolio: Portfolio;
  loyaltyTierSummary: LoyaltyTierSummary;
  stats: Stats;
}

/** ===========================================================================
 * Parse CSV Row Logic
 * ============================================================================
 */

export const parseCelsiusRewardsData = (
  rewardsData: CoinDataMap,
  metrics: CelsiusRewardsMetrics,
) => {
  let tier = "";

  // Process the row data and update all the values we want to track
  for (const [coin, data] of Object.entries(rewardsData)) {
    // Get loyalty tier
    tier = data.loyaltyTier.title;
    const interestCoin = data.interestCoin;

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
    if (data.earningInterestInCel) {
      totalEarnInCEL = totalEarnInCEL.plus(1);
    } else if (interestCoin === "CEL") {
      // The earningInterestInCel flag happens to be false for CEL earning CEL
      totalEarnInCEL = totalEarnInCEL.plus(1);
    }

    // Update in portfolio metrics total
    let existing = metrics.portfolio[coin];
    metrics.portfolio[coin] = {
      ...existing,
      total: total.toString(),
      totalEarnInCEL: totalEarnInCEL.toString(),
      numberOfUsersHolding: numberOfUsersHolding.toString(),
    };

    existing = metrics.portfolio[interestCoin];
    metrics.portfolio[interestCoin] = {
      ...existing,
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

  const tierKey = tier.toLowerCase();
  // Increment loyalty tier count
  if (tierKey in metrics.loyaltyTierSummary) {
    metrics.loyaltyTierSummary[tierKey] =
      metrics.loyaltyTierSummary[tierKey] + 1;
  } else {
    console.warn(`Unexpected loyalty tier title found: ${tier}`);
  }
};
