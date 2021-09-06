import rewards_01 from "../data/01-rewards.json";
import rewards_02 from "../data/02-rewards.json";
import rewards_03 from "../data/03-rewards.json";
import rewards_04 from "../data/04-rewards.json";
import rewards_05 from "../data/05-rewards.json";
import rewards_06 from "../data/06-rewards.json";
import rewards_07 from "../data/07-rewards.json";
import rewards_08 from "../data/08-rewards.json";
import rewards_09 from "../data/09-rewards.json";
import rewards_10 from "../data/10-rewards.json";
import rewards_11 from "../data/11-rewards.json";

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
 * ============================================================================
 */

const rewardsData: CelsiusRewardsDataType[] = [
  rewards_01,
  rewards_02,
  rewards_03,
  rewards_04,
  rewards_05,
  rewards_06,
  rewards_07,
  rewards_08,
  rewards_09,
  rewards_10,
  rewards_11,
];

export type DateRangesType =
  | "June 18, 2021 - June 25, 2021"
  | "June 25, 2021 - July 2, 2021"
  | "July 2, 2021 - July 9, 2021"
  | "July 9, 2021 - July 16, 2021"
  | "July 16, 2021 - July 23, 2021"
  | "July 23, 2021 - July 30, 2021"
  | "July 30, 2021 - August 6, 2021"
  | "August 6, 2021 - August 13, 2021"
  | "August 13, 2021 - August 20, 2021"
  | "August 20, 2021 - August 27, 2021"
  | "August 27, 2021 - September 3, 2021";

export const dateRanges: DateRangesType[] = [
  "June 18, 2021 - June 25, 2021",
  "June 25, 2021 - July 2, 2021",
  "July 2, 2021 - July 9, 2021",
  "July 9, 2021 - July 16, 2021",
  "July 16, 2021 - July 23, 2021",
  "July 23, 2021 - July 30, 2021",
  "July 30, 2021 - August 6, 2021",
  "August 6, 2021 - August 13, 2021",
  "August 13, 2021 - August 20, 2021",
  "August 20, 2021 - August 27, 2021",
  "August 27, 2021 - September 3, 2021",
];

export type RewardsDataMap = Map<DateRangesType, CelsiusRewardsDataType>;

export const getRewardsDataMap = () => {
  const rewardsDataMap: RewardsDataMap = new Map();

  for (let i = 0; i < rewardsData.length; i++) {
    const rewards = rewardsData[i];
    const date = dateRanges[i];
    rewardsDataMap.set(date, rewards);
  }

  return rewardsDataMap;
};
