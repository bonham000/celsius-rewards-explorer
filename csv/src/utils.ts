import BigNumber from "bignumber.js";

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
  totalUsers: number;
  averageNumberOfCoinsPerUser: number;
  totalPortfolioCoinPositions: number;
}

export interface CelsiusRewardsMetrics {
  portfolio: Portfolio;
  loyaltyTierSummary: LoyaltyTierSummary;
  stats: Stats;
}

export const parseCelsiusRewardsData = (
  rewardsData: CoinDataMap,
  metrics: CelsiusRewardsMetrics,
) => {
  let tier = "";

  for (const [coin, data] of Object.entries(rewardsData)) {
    // Get loyalty tier
    tier = data.loyaltyTier.title;

    // Initialize all to zero
    let existingTotal = new BigNumber("0");
    let totalEarnInCEL = new BigNumber("0");
    let totalInterestInCoin = new BigNumber("0");
    let totalInterestInUsd = new BigNumber("0");
    let numberOfUsersHolding = new BigNumber("0");

    // Re-Initialize if coin already exists in portfolio metrics
    if (coin in metrics.portfolio) {
      const entry = metrics.portfolio[coin];
      existingTotal = new BigNumber(entry.total);
      totalEarnInCEL = new BigNumber(entry.totalEarnInCEL);
      totalInterestInCoin = new BigNumber(entry.totalInterestInCoin);
      totalInterestInUsd = new BigNumber(entry.totalInterestInUsd);
      numberOfUsersHolding = new BigNumber(entry.numberOfUsersHolding);
    }

    // Add existing coin data to current value
    const distribution = data.distributionData;
    const currentBalance = distribution[distribution.length - 1].newBalance;
    const total = existingTotal.plus(currentBalance);
    totalInterestInCoin = totalInterestInCoin.plus(data.totalInterestInCoin);
    totalInterestInUsd = totalInterestInUsd.plus(data.totalInterestInUsd);
    numberOfUsersHolding = numberOfUsersHolding.plus(1);
    if (data.earningInterestInCel) {
      totalEarnInCEL = totalEarnInCEL.plus(1);
    }

    // Update in portfolio metrics total
    metrics.portfolio[coin] = {
      total: total.toString(),
      totalEarnInCEL: totalEarnInCEL.toString(),
      totalInterestInCoin: totalInterestInCoin.toString(),
      totalInterestInUsd: totalInterestInUsd.toString(),
      numberOfUsersHolding: numberOfUsersHolding.toString(),
    };
  }

  const tierKey = tier.toLowerCase();
  if (tierKey in metrics.loyaltyTierSummary) {
    metrics.loyaltyTierSummary[tierKey]++;
  } else {
    console.warn(`Unexpected loyalty tier title found: ${tier}`);
  }
};
