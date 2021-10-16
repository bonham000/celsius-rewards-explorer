import React from "react";
import { isMobile } from "react-device-detect";
import axios from "axios";
import coinSymbolMapJSON from "../data/coins.json";
import { RewardsDataMap } from "./rewards";

/** ===========================================================================
 * Type Definitions
 * ============================================================================
 */

interface PortfolioCoinEntry {
  total: string;
  totalEarnInCEL: string;
  totalInterestInCoin: string;
  totalInterestInUsd: string;
  numberOfUsersHolding: string;
  lockedCollateral: string;
}

type Portfolio = { [coin: string]: PortfolioCoinEntry };

export interface RankingsLevels {
  topOne: string;
  topTen: string;
  topHundred: string;
  topThousand: string;
  topTenThousand: string;
  medianValue: string;
}

export const rankingsArray: Array<[string, keyof RankingsLevels]> = [
  ["Rank 1", "topOne"],
  ["Rank 10", "topTen"],
  ["Rank 100", "topHundred"],
  ["Rank 1,000", "topThousand"],
  ["Rank 10,000", "topTenThousand"],
];

interface CoinDistribution {
  uuid: string;
  total: string;
  balance: string;
  collateral: string;
}
type CoinDistributions = { [coin: string]: CoinDistribution[] };
type CoinDistributionLevelsMap = { [coin: string]: RankingsLevels };

export type CoinPriceMap = { [key: string]: number };

export interface CelsiusRewardsDataType {
  portfolio: Portfolio;
  coinDistributions: CoinDistributions;
  coinDistributionsLevels: CoinDistributionLevelsMap;
  interestEarnedRankings: RankingsLevels;
  loyaltyTierSummary: {
    platinum: string;
    gold: string;
    silver: string;
    bronze: string;
    none: string;
  };
  stats: {
    totalUsers: string;
    maximumPortfolioSize: string;
    totalInterestPaidInUsd: string;
    totalUsersEarningInCel: string;
    averageNumberOfCoinsPerUser: string;
    totalPortfolioCoinPositions: string;
    maxInterestEarned: string;
    averageInterestPerUser: string;
  };
}

interface PortfolioAllocation {
  coin: string;
  value: number;
  numberOfCoins: number;
}

export type PortfolioAllocations = Array<PortfolioAllocation>;

interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
}

type CoinSymbolMap = { [key: string]: CoinGeckoCoin };

const fullMap: CoinSymbolMap = coinSymbolMapJSON;

// Map the ids to keys as well
for (const coin of Object.values(fullMap)) {
  fullMap[coin.id] = coin;
}

const coinSymbolMap: CoinSymbolMap = fullMap;

const PRICE_MAP_KEY = "PRICE_MAP_KEY";

export type Nullable<T> = T | null;

export type TimeLapseChartView =
  | "Holders"
  | "Tokens"
  | "Total Tokens"
  | "Total Users";

export const timeLapseChartViewOptions: TimeLapseChartView[] = [
  "Holders",
  "Tokens",
  "Total Tokens",
  "Total Users",
];

/** ===========================================================================
 * Utils
 * ============================================================================
 */

export const readCachedCoinPriceData = (
  dataset: CelsiusRewardsDataType,
): CoinPriceMap | null => {
  const cachedPriceMap = localStorage.getItem(PRICE_MAP_KEY);
  if (cachedPriceMap) {
    try {
      // Try to restore coin price data from local cache
      const priceMap: { timestamp: number; coinPriceMap: CoinPriceMap } =
        JSON.parse(cachedPriceMap);

      const { timestamp, coinPriceMap } = priceMap;
      const now = Date.now();
      const elapsed = now - timestamp;
      let sixHoursInMilliseconds = 1000 * 60 * 60 * 6;
      // Uncomment to bust the cache.
      // Note that the CoinGecko API will quickly rate limit requests.
      // sixHoursInMilliseconds = 5000;

      const coins = Object.keys(dataset.portfolio);

      // Bust the cache if the dataset has a coin not found in the cache.
      for (const coin of coins) {
        if (!(coin in coinPriceMap)) {
          console.warn(`Found missing coin in cached data: ${coin}.`);
          return null;
        }
      }

      // Ensure we are still within the 6 hour window
      if (elapsed <= sixHoursInMilliseconds) {
        console.log("Using cached price data.");
        return coinPriceMap;
      }
    } catch (err) {
      // If any error happens fall through to fetch the price data again
      console.warn(
        "Unexpected error restoring price data from cache, error: ",
        err,
      );
    }
  }

  return null;
};

export const cacheCoinPriceMap = (coinPriceMap: CoinPriceMap) => {
  const timestamp = Date.now();
  const serializedData = JSON.stringify({ timestamp, coinPriceMap });
  localStorage.setItem(PRICE_MAP_KEY, serializedData);
};

type PriceEntry = [string, number] | null;

export const handleFetchingCoinPricesAsync = async (
  coins: string[],
): Promise<PriceEntry[]> => {
  try {
    // TCAD... reference: https://www.coingecko.com/en/coins/truecad
    let results: PriceEntry[] = [["TCAD", 0.777879]];

    const list = coins.filter((x) => x !== "TCAD");
    const ids = list
      .map((x) => {
        const item = coinSymbolMap[x];
        if (item === undefined) {
          const msg = `[WARN]: Found a coin which needs to be added: ${x}`;
          throw new Error(msg);
        }

        return item.id;
      })
      .join(",");
    const vs = "usd,".repeat(coins.length);
    const params = `ids=${ids}&vs_currencies=${vs}`;

    // Fetch the price data
    type CoinGeckoResponse = { [id: string]: { usd: number } };
    const url = `https://api.coingecko.com/api/v3/simple/price?${params}`;
    const response = await axios.get<CoinGeckoResponse>(url);

    // Map the price response data
    for (const [key, value] of Object.entries(response.data)) {
      const price = value.usd;
      const { symbol } = coinSymbolMap[key];
      const entry: PriceEntry = [symbol.toUpperCase(), price];
      results.push(entry);
    }

    return results;
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const formatValue = (value: string | number, decimals?: number) => {
  const stringValue: string = typeof value === "number" ? String(value) : value;

  const options = {
    minimumFractionDigits: decimals || 0,
    maximumFractionDigits: decimals || 0,
  };

  return parseFloat(stringValue).toLocaleString("en", options);
};

export const getProjectedAnnualYield = (
  totalInterestPaid: string,
  totalAssetValue: number,
) => {
  const interest = parseFloat(totalInterestPaid) / totalAssetValue;
  const annualized = interest * 52;
  const percent = annualized * 100;
  const label = ` ${percent.toFixed(2)}%`;
  return label;
};

// Copy some text to the clipboard
export const copyToClipboard = (text: string) => {
  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
};

export const chartKeyMap = {
  total: {
    title: "Total Value",
    description: "Total Asset Value Held in Each Coin (USD)",
  },
  interest_paid: {
    title: "Interest Paid",
    description: "Total Interest Paid for Each Coins (USD)",
  },
  earning_in_cel: {
    title: "Earning in CEL",
    description: "Number of Users Earning in CEL for Each Coin",
  },
  number_of_users: {
    title: "Number of Users",
    description: "Number of Users Holding Each Coin",
  },
  locked_collateral: {
    title: "Locked Collateral",
    description: "Coins Locked as Collateral in Past 7 Days",
  },
};

export type ChartType = keyof typeof chartKeyMap;

export const chartKeys = Object.keys(chartKeyMap) as ChartType[];

export const handleGetChartData = ({
  chartType,
  portfolio,
  viewTopCoins,
  coinPriceMap,
  portfolioAllocations,
}: {
  chartType: ChartType;
  viewTopCoins: boolean;
  coinPriceMap: CoinPriceMap;
  portfolio: [string, PortfolioCoinEntry][];
  portfolioAllocations: PortfolioAllocations;
}) => {
  let chart = [];
  switch (chartType) {
    case "total": {
      chart = portfolioAllocations;
      break;
    }
    case "interest_paid": {
      for (const [coin, values] of portfolio) {
        chart.push({ coin, value: parseFloat(values.totalInterestInUsd) });
      }
      break;
    }
    case "earning_in_cel": {
      for (const [coin, values] of portfolio) {
        chart.push({ coin, value: parseFloat(values.totalEarnInCEL) });
      }
      break;
    }
    case "number_of_users": {
      for (const [coin, values] of portfolio) {
        chart.push({ coin, value: parseFloat(values.numberOfUsersHolding) });
      }
      break;
    }
    case "locked_collateral": {
      for (const [coin, values] of portfolio) {
        const collateral =
          parseFloat(values.lockedCollateral) * coinPriceMap[coin];
        chart.push({ coin, value: collateral });
      }
      break;
    }
  }

  // Sort by value
  const sortedResult = chart.sort((a, b) => b.value - a.value);

  if (viewTopCoins) {
    // Limit to less on mobile
    const limit = isMobile ? 10 : 20;
    return sortedResult.slice(0, limit);
  } else {
    return sortedResult;
  }
};

export const renderCustomPieChartLabel = (
  { cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any,
  currentPortfolioAllocation: PortfolioAllocations,
) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.3;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Find the corresponding coin allocation this slice represents
  const allocation = currentPortfolioAllocation[index];

  // Exclude small percentages from having a label (there are too many)
  if (percent <= 0.01) {
    return null;
  }

  return (
    <text
      x={x}
      y={y}
      fill="white"
      dominantBaseline="central"
      textAnchor={x > cx ? "start" : "end"}
    >
      {`${allocation.coin} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

type TooltipChartType =
  | "bar"
  | "pie"
  | "portfolio"
  | "distribution"
  | "timelapse";

export const handleFormatTooltipValue = ({
  item,
  value,
  chart,
  chartType,
  displayFiat,
}: {
  item: { payload: PortfolioAllocation & { uuid: string } };
  value: string;
  displayFiat: boolean;
  chartType: ChartType;
  chart: TooltipChartType;
}) => {
  const formattedValue = formatValue(value);

  if (chart === "pie") {
    return `${formattedValue} users`;
  } else if (chart === "portfolio") {
    return `$${formattedValue}`;
  } else if (chart === "distribution") {
    const { uuid } = item.payload;
    if (displayFiat) {
      return (
        <span>
          ${formattedValue}
          <br />
          Anonymized User ID: {uuid}
        </span>
      );
    } else {
      return (
        <span>
          {formattedValue} total tokens
          <br />
          Anonymized User ID: {uuid}
        </span>
      );
    }
  } else if (chart === "timelapse") {
    return capitalize(formattedValue);
  }

  switch (chartType) {
    case "total": {
      const { coin, numberOfCoins } = item.payload;
      return (
        <span>
          ${formattedValue}
          <br />
          {formatValue(numberOfCoins)} total {coin}
        </span>
      );
    }
    case "interest_paid": {
      return `$${formattedValue}`;
    }
    case "number_of_users":
    case "earning_in_cel": {
      return `${formattedValue} users`;
    }
    case "locked_collateral": {
      return `$${formatValue(value)} total USD locked in past 7 days.`;
    }
  }
};

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1);

export type TimeLapseChartData = ReturnType<
  typeof handleGetPortfolioTimeLapseData
>;

export const handleGetPortfolioTimeLapseData = ({
  chartSelection,
  chartView,
  rewardsDataMap,
}: {
  chartSelection: string;
  chartView: TimeLapseChartView;
  rewardsDataMap: RewardsDataMap;
}) => {
  let result = [];

  for (const [dateRange, dataset] of Array.from(rewardsDataMap.entries())) {
    const { portfolio } = dataset;

    if (chartView === "Total Users") {
      const { totalUsers } = dataset.stats;
      result.push({
        date: dateRange,
        [chartView]: totalUsers,
      });
    } else if (chartView === "Total Tokens") {
      const total = Object.entries(portfolio).reduce(
        (aggregate, item) => {
          const data = item[1];
          const value = data.total;

          return {
            ...aggregate,
            [chartView]: parseFloat(value) + aggregate[chartView],
          };
        },
        { [chartView]: 0 },
      );

      result.push({ ...total, date: dateRange });
    } else {
      // Filter only the entry matching the selected coin
      const entry = Object.entries(portfolio)
        .filter(([coin]) => coin === chartSelection)
        .filter(Boolean)[0];

      // Confirm entry exists
      if (entry) {
        const [coin, data] = entry;
        const value =
          chartView === "Holders" ? data.numberOfUsersHolding : data.total;

        // Push value onto results array
        result.push({
          date: dateRange,
          [coin]: parseFloat(value),
        });
      }
    }
  }

  return result;
};

export const isTimeLapseChartTokenOnlyView = (view: TimeLapseChartView) => {
  return view === "Total Tokens" || view === "Total Users";
};

export const getAxisBoundsForTimeLapseChart = (
  timeLapseData: TimeLapseChartData,
  timeLapseChartView: TimeLapseChartView,
  timeLapseChartSelection: string,
) => {
  // Get the upper and lower ranges for setting the y axis
  let min = Infinity;
  let max = -Infinity;

  // Find the min and max values in the dataset
  for (const entry of timeLapseData) {
    const view = timeLapseChartView;
    const coin = timeLapseChartSelection;
    const key = isTimeLapseChartTokenOnlyView(view) ? view : coin;

    // @ts-ignore
    const value = entry[key];
    min = Math.min(min, value as number);
    max = Math.max(max, value as number);
  }

  // Set upper and lower bounds at 10% the min and max values
  const lower = Math.floor(min - min * 0.01);
  const upper = Math.floor(max + max * 0.01);

  return { lower, upper };
};

export const calculateTotalCollateralInUSD = (
  coinDistribution: Portfolio,
  coinPriceMap: CoinPriceMap,
) => {
  let total = 0;
  for (const [coin, entry] of Object.entries(coinDistribution)) {
    const price = coinPriceMap[coin];
    const usd = parseFloat(entry.lockedCollateral) * price;
    total += usd;
  }

  return total;
};
