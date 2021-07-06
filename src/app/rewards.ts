import rewards_01 from "../data/01-rewards.json";
import rewards_02 from "../data/02-rewards.json";

import { CelsiusRewardsDataType } from "./utils";

/**
 * Add more date ranges here for future weekly datasets.
 */
export type DateRangesType =
  | "June 18, 2021 - June 25, 2021"
  | "June 25, 2021 - July 2, 2021";

export const dateRanges: DateRangesType[] = [
  "June 18, 2021 - June 25, 2021",
  "June 25, 2021 - July 2, 2021",
];

export type RewardsDataMap = Map<DateRangesType, CelsiusRewardsDataType>;

export const getRewardsDataMap = () => {
  const rewardsDataMap: RewardsDataMap = new Map();

  /**
   * Initialize map with data. This is where the DATE_IDENTIFIER values
   * from the csv script get mapped to specific date ranges which the
   * app can understand.
   *
   * Add additional rewards data here in the future when needed.
   */
  rewardsDataMap.set(dateRanges[0], rewards_01);
  rewardsDataMap.set(dateRanges[1], rewards_02);

  return rewardsDataMap;
};
