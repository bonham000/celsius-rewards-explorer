import rewards_01 from "../data/01-rewards.json";
import rewards_02 from "../data/02-rewards.json";

import { CelsiusRewardsDataType } from "./utils";

/** ===========================================================================
 * Rewards Data
 * ----------------------------------------------------------------------------
 * This is where the rewards datasets are imported and we assign them to
 * their corresponding data range. To add a future dataset:
 *
 * 1. Import and process the CSV file.
 * 2. Import the JSON result here.
 * 3. Add the corresponding data range.
 * 4. Add the entry to the rewardsDataMap.
 * ============================================================================
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

  // Add future datasets here
  rewardsDataMap.set(dateRanges[0], rewards_01);
  rewardsDataMap.set(dateRanges[1], rewards_02);

  return rewardsDataMap;
};
