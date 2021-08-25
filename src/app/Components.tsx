import React from "react";
import { isMobile } from "react-device-detect";
import styled from "styled-components";
import { PortfolioView } from "./App";

/** ===========================================================================
 * Components and Styles
 * ============================================================================
 */

export const loyaltyTierColors = {
  platinum: "rgb(161, 167, 195)",
  gold: "rgb(206, 165, 98)",
  silver: "rgb(214, 214, 214)",
  bronze: "rgb(254, 189, 149)",
  none: "rgb(50, 50, 50)",
};

export const portfolioPieColors = [
  "rgb(112, 31, 191)",
  "rgb(188, 62, 179)",
  "rgb(244, 65, 171)",
  "rgb(215, 64, 176)",
  "rgb(15, 27, 100)",
  "#027ed1",
  "#4C66F5",
  "#4F99FF",
  "#54B9E8",
  "#ff5f97",
  "#f95d6a",
  "#eb4034",
  "#ff5b39",
  "#ff7c43",
  "#ffa600",
  "#0A2239",
  "#003f5c",
  "#2f4b7c",
  "#665191",
  "#8902d1",
  "#b76fd2",
  "#a05195",
  "#d45087",
  "#11d47c",
  "#56d162",
  "#7ace49",
  "#99c930",
  "#2a262b",
  "#4a3243",
  "#713c54",
  "#9a465a",
  "#c15356",
  "#ffb23e",
  "#ffbf61",
  "#ffcb81",
  "#ffd8a0",
  "#ffe5c0",
  "#ff1f55",
  "#ff0073",
  "#e6194b",
  "#2F243A",
  "#ec4e20",
  "#FFBC42",
  "#D81159",
  "#0496FF",
  "#006BA6",
];

export const CelsiusColors = [
  "rgb(15, 27, 100)",
  "rgb(112, 31, 191)",
  "rgb(112, 31, 185)",
  "rgb(188, 62, 179)",
  "rgb(215, 64, 176)",
  "rgb(244, 65, 171)",
];

export const getColor = () => {
  return CelsiusColors[Math.floor(Math.random() * CelsiusColors.length)];
};

export const RANDOM_COLOR = getColor();

export const CELSIUS_ORANGE = "rgb(245, 160, 75)";

export const getPortfolioSelectText = (view: PortfolioView) => {
  let text = "";
  if (view === "all") {
    text = "View all coins";
  } else if (view === "top") {
    text = "View most held 10 coins only";
  } else {
    text = "View least held 20 coins only";
  }
  return text;
};

export const MOBILE = `(max-width: 768px)`;

export const Page = styled.div`
  padding: 75px;
  padding-top: 15px;
  padding-bottom: 0;
  text-align: center;

  @media ${MOBILE} {
    padding: 8px;
    padding-bottom: 50px;
  }
`;

export const PageTitle = styled.h1`
  font-weight: 600;
  margin-bottom: 4px;
`;

export const Subtitle = styled.p`
  font-size: 12px;

  @media ${MOBILE} {
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }
`;

export const InfoText = styled.p`
  font-size: 12px;
`;

export const CardTitle = styled.h2`
  margin-top: 2px;
  margin-bottom: 2px;
`;

export const ChartTitle = styled.h3`
  margin: 0;
  margin-left: 2px;
`;

export const ChartControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;

  @media ${MOBILE} {
    margin-top: 12px;
  }
`;

export const ChartContainer = styled.div`
  width: 100%;
  height: 100%;
`;

export const ChartLoading = styled.div`
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ChartTitleRow = styled.div`
  padding-left: 65px;
  padding-right: 10px;
  padding-bottom: 2px;
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;

  @media ${MOBILE} {
    padding: 8px;
    flex-direction: column;
  }
`;

export const SummaryRow = styled.div`
  margin-top: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;

  @media ${MOBILE} {
    padding: 0px;
    flex-direction: column;
    justify-content: center;
  }
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
`;

export const PortfolioContainer = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  width: 80vw;
  padding-bottom: 50px;

  @media ${MOBILE} {
    width: auto;
    flex-direction: column;
    justify-content: center;
  }
`;

export const RightSide = styled.div`
  padding-top: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

export const CoinHoldingsControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

export const DialogBodyContent = (
  <>
    <b>Rewards Data:</b>
    <p>
      • The data on this page is compiled from the recently launched{" "}
      <a target="__blank" href="https://youtu.be/XIMQKJXUke8">
        Celsius Proof of Community
      </a>{" "}
      feature, which summarizes the weekly Celsius rewards distributions. Please
      note that it only includes balances earning rewards, and does not
      represent assets which are locked as collateral or other assets owned by
      Celsius which are not earning rewards.
    </p>
    <b>Source Code:</b>
    <p>
      • This project is open source and relies on the public CSV Proof of
      Community data published by Celsius. You can find the{" "}
      <a
        target="__blank"
        href="https://github.com/bonham000/celsius-rewards-explorer"
      >
        project source code on GitHub
      </a>
      .
    </p>
    <b>Original CSV Files:</b>
    <p>
      • The CSV files are very large (over 1GB) and are not included in this app
      or associated codebase. If you want to inspect the data directly, please
      download the files from Celsius.
    </p>
    <b>Issues or Bugs:</b>
    <p>
      • All of the data displayed here comes from the Celsius Proof of Community
      CSV. If you find any issues or problems, feel free to bring them up in The
      Celsians Club Discord or{" "}
      <a
        target="__blank"
        href="https://github.com/bonham000/celsius-rewards-explorer/issues/new"
      >
        open an issue on GitHub
      </a>
      .
    </p>
  </>
);

export const earnInCelTooltipContent = (
  <div style={{ maxWidth: isMobile ? 300 : 500 }}>
    <p>
      This number is counted from each user who for at least one coin holding
      has elected to earn in CEL (referencing the{" "}
      <code>earningInterestInCel</code> field in the CSV data) OR is holding CEL
      and earning CEL.
    </p>
    <p>
      This may not be consistent with the earn in CEL percentage displayed by
      Celsius. I am not sure where the discrepancy is and I am happy to change
      the data interpretation here.
    </p>
  </div>
);

export const loyaltyTiersTooltipContent = (
  <div style={{ maxWidth: isMobile ? 300 : 500 }}>
    <p>
      Many users are labeled with the <code>NONE</code> loyalty tier, which does
      not appear to be correct. This is inconsistent with the rewards
      distribution data and the in-app reported number of "earn in CEL" users,
      which is over 50%.
    </p>
    <p>
      I counted these by relying on the <code>loyaltyTier.title</code> field for
      each user in the CSV file, and doubled checked the logic and results were
      correct. I may still have made a mistake, but I could not find where.
    </p>
  </div>
);

export const topHoldersTooltipContent = (
  <div style={{ maxWidth: isMobile ? 300 : 500 }}>
    <p>
      Only the top 100 holders are displayed. This is because the distribution
      is dramatically skewed by the top 1-3 whales and a long tail of very small
      holders. The overall number of holders is also huge, which can be unwieldy
      to work with and visualize. Limiting to the top 100 is more practical and
      still provides useful insights.
    </p>
  </div>
);
