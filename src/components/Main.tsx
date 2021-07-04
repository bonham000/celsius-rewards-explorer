import React from "react";
import { isMobile } from "react-device-detect";
import { Tooltip2 } from "@blueprintjs/popover2";
import {
  Button,
  Card,
  Icon,
  Drawer,
  Classes,
  Dialog,
  Elevation,
  MenuItem,
  Position,
  Switch,
  Toaster,
  FocusStyleManager,
} from "@blueprintjs/core";
import styled from "styled-components";
import { Select } from "@blueprintjs/select";
import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import rewards_01 from "../data/01-rewards.json";
import coinSymbolMapJSON from "../data/coins.json";
import originalCSV from "../data/csv-row-sample.json";
import axios from "axios";
import JSONPretty from "react-json-pretty";

FocusStyleManager.onlyShowFocusOnTabs();

/** ===========================================================================
 * JSON rewards data type
 * ============================================================================
 */

interface PortfolioCoinEntry {
  total: string;
  totalEarnInCEL: string;
  totalInterestInCoin: string;
  totalInterestInUsd: string;
  numberOfUsersHolding: string;
}

type Portfolio = { [coin: string]: PortfolioCoinEntry };

interface CelsiusRewardsDataType {
  portfolio: Portfolio;
  loyaltyTierSummary: {
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
    none: number;
  };
  stats: {
    totalUsers: string;
    maximumPortfolioSize: string;
    totalInterestPaidInUsd: string;
    averageNumberOfCoinsPerUser: string;
    totalPortfolioCoinPositions: string;
  };
}

/** ===========================================================================
 * Types & Config
 * ============================================================================
 */

const AppToaster = Toaster.create({
  className: "app-toaster",
  position: Position.TOP,
});

interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
}

type CoinPriceMap = { [key: string]: number };
type CoinSymbolMap = { [key: string]: CoinGeckoCoin };

const coinSymbolMap: CoinSymbolMap = coinSymbolMapJSON;

const PRICE_MAP_KEY = "PRICE_MAP_KEY";

const chartKeyMap = {
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
};

type ChartType = keyof typeof chartKeyMap;

const chartKeys = Object.keys(chartKeyMap) as ChartType[];

type DateRangesType = "June 18, 2021 - June 25, 2021";

const dateRanges: DateRangesType[] = ["June 18, 2021 - June 25, 2021"];

const rewardsDataMap: Map<DateRangesType, CelsiusRewardsDataType> = new Map();

/**
 * Initialize map with data. This is where the DATE_IDENTIFIER values
 * from the csv script get mapped to specific date ranges which the
 * app can understand.
 *
 * Add additional rewards data here in the future when needed.
 */
rewardsDataMap.set(dateRanges[0], rewards_01);

const DateSelect = Select.ofType<DateRangesType>();
const ChartSelect = Select.ofType<ChartType>();

interface IState {
  loading: boolean;
  dialogOpen: boolean;
  viewTopCoins: boolean;
  chartType: ChartType;
  coinPriceMap: CoinPriceMap;
  dateRange: DateRangesType;
  drawerOpen: boolean;
  totalAssetValue: number | null;
}

/** ===========================================================================
 * React Component
 * ============================================================================
 */

class Main extends React.Component<{}, IState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      loading: true,
      drawerOpen: false,
      viewTopCoins: true,
      dialogOpen: false,
      coinPriceMap: {},
      chartType: "total",
      totalAssetValue: null,
      dateRange: dateRanges[0],
    };
  }

  async componentDidMount() {
    // First try to restore price data from local cache
    const didRestorePriceDataFromCache = this.restorePriceDataFromCache();

    // If restoring from the cache, fetch the data.
    if (didRestorePriceDataFromCache === "failure") {
      console.log(
        "Price cache expired or doesn't exist, fetching new prices...",
      );
      this.fetchCoinPriceData();
    }
  }

  restorePriceDataFromCache = (): "success" | "failure" => {
    const cachedPriceMap = localStorage.getItem(PRICE_MAP_KEY);
    if (cachedPriceMap) {
      try {
        // Try to restore coin price data from local cache
        const priceMap = JSON.parse(cachedPriceMap);
        const { timestamp, coinPriceMap } = priceMap;
        const now = Date.now();
        const elapsed = now - timestamp;
        let sixHoursInMilliseconds = 1000 * 60 * 60 * 6;
        // Uncomment to bust the cache.
        // Note that the CoinGecko API will quickly rate limit requests.
        // sixHoursInMilliseconds = 5000;

        const dataset = this.getCurrentDataSet();
        const coins = Object.keys(dataset.portfolio);

        // Bust the cache if the dataset has a coin not found in the cache.
        for (const coin of coins) {
          if (!(coin in coinPriceMap)) {
            console.warn(`Found missing coin in cached data: ${coin}.`);
            return "failure";
          }
        }

        if (elapsed <= sixHoursInMilliseconds) {
          console.log("Using cached price data.");
          this.setState(
            { loading: false, coinPriceMap },
            this.calculateTotalAssetValue,
          );
          return "success";
        }
      } catch (err) {
        // If any error happens fall through to fetch the price data again
        console.warn(
          "Unexpected error restoring price data from cache, error: ",
          err,
        );
      }
    }

    return "failure";
  };

  fetchCoinPriceData = async () => {
    // Fetch all price data for current dataset
    const data = this.getCurrentDataSet();
    const coins = Object.keys(data.portfolio);

    // Fetch the price for each coin
    const prices = await Promise.all(coins.map(this.fetchCoinPrice));

    // Reduce list of prices into a map
    const coinPriceMap = prices.filter(Boolean).reduce((map, result) => {
      // Null values are filtered above
      const [coin, price] = result as [number, number];
      return {
        ...map,
        [coin]: price,
      };
    }, {});

    // Update state and calculate total asset value using the new prices
    this.setState({ loading: false, coinPriceMap }, () => {
      this.cacheCoinPriceMap();
      this.calculateTotalAssetValue();
    });
  };

  fetchCoinPrice = async (coin: string) => {
    try {
      // TCAD... reference: https://www.coingecko.com/en/coins/truecad
      if (coin === "TCAD") {
        return ["TCAD", 0.777879];
      }

      const id = coinSymbolMap[coin].id;
      type CoinGeckoResponse = { [id: string]: { usd: number } };
      const response = await axios.get<CoinGeckoResponse>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      );
      const price = response.data[id].usd;
      return [coin, price];
    } catch (err) {
      console.warn(`Failed to fetch prices for coin: ${coin}`);
      return null;
    }
  };

  cacheCoinPriceMap = () => {
    const { coinPriceMap } = this.state;
    const timestamp = Date.now();
    const serializedData = JSON.stringify({ timestamp, coinPriceMap });
    localStorage.setItem(PRICE_MAP_KEY, serializedData);
  };

  render() {
    const data = this.getCurrentDataSet();

    const DateRangeSelect = (
      <DateSelect
        items={dateRanges}
        filterable={false}
        activeItem={this.state.dateRange}
        onItemSelect={(item) => {
          /**
           * Update state with the new data rage.
           *
           * NOTE: It's possible the new dataset has coins which
           * don't have price data yet (i.e.) did not exist in the
           * previous dataset. If that happens we would want to re-fetch
           * coin prices here.
           */
          this.setState({ dateRange: item });
        }}
        itemRenderer={(item, { handleClick }) => {
          const isActive = item === this.state.dateRange;
          return (
            <MenuItem
              text={item}
              disabled={isActive}
              onClick={(e: any) => handleClick(e)}
            />
          );
        }}
      >
        <Button
          rightIcon="calendar"
          style={{ marginLeft: 4 }}
          text={this.state.dateRange}
          onClick={() =>
            this.toast("Only one date range exists currently.", "warning")
          }
        />
      </DateSelect>
    );

    return (
      <Page>
        <Dialog
          canEscapeKeyClose
          canOutsideClickClose
          isOpen={this.state.dialogOpen}
          onClose={() => this.setState({ dialogOpen: false })}
        >
          <div className={Classes.DIALOG_BODY}>
            <b>Proof of Community:</b>
            <p>
              The data on this page is compiled from the recently launched{" "}
              <a target="__blank" href="https://youtu.be/XIMQKJXUke8">
                Celsius Proof of Community
              </a>{" "}
              feature, which summarizes the Celsius rewards distributions from
              the week of June 18 to June 25.
            </p>
            <p>
              Link to the{" "}
              <a
                target="__blank"
                href="https://etherscan.io/tx/0xef41ef12b1d1378af48e8f3461efeb98be550cdfd13eca8a49c348fe94d86b79"
              >
                Etherscan Proof
              </a>{" "}
              of the CSV rewards data.
            </p>
            <b>Observations:</b>
            <p>
              • There is a strong preference for users to earn in CEL. Over 75%
              of BTC holders, which is the largest coin holding (CEL is 2nd),
              are earning in CEL.
            </p>
            <p>
              • All of the charts appear to follow a power law distribution,
              with most of users concentrated around a few coins and a long tail
              of smaller coins with few holders.{" "}
            </p>
            <p>
              • The smallest coins have very few users, e.g. ZUSD only has 3
              holders.
            </p>
            <p>
              • The top coin holdings are, unsurprisingly, BTC, ETH, CEL, and
              USDC.
            </p>
            <b>Loyalty Tiers:</b>
            <p>
              • I'm not sure if the loyalty tier breakdown is correct. I made a
              note about this in the{" "}
              <Icon color="rgb(130, 130, 130)" icon="help" /> tooltip next to
              that pie chart.
            </p>
            <b>Source Code:</b>
            <p>
              • This project is open source and relies on the public CSV Proof
              of Community data published by Celsius. You can find the{" "}
              <a
                target="__blank"
                href="https://github.com/bonham000/celsius-rewards-explorer"
              >
                project source code on GitHub
              </a>
              .
            </p>
            <b>By the Way:</b>
            <p>
              • If you happen to know anyone at Celsius, I am interested in
              working for them,{" "}
              <a target="__blank" href="mailto:sean.smith.2009@gmail.com">
                this is my contact email
              </a>{" "}
              🙂
            </p>
            <RightSide>
              <Button
                text="Dismiss"
                icon="disable"
                onClick={this.toggleDialog}
              />
            </RightSide>
          </div>
        </Dialog>
        <Drawer
          icon="document"
          title="Sample CSV Row Data"
          isOpen={this.state.drawerOpen}
          onClose={() => this.setState({ drawerOpen: false })}
        >
          <div className={Classes.DRAWER_BODY}>
            <div className={Classes.DIALOG_BODY}>
              <JSONPretty
                id="json-pretty"
                data={originalCSV}
                mainStyle="background:rgb(26,26,26);border-radius:8px;"
              ></JSONPretty>
            </div>
          </div>
        </Drawer>
        <PageTitle>Celsius Proof of Community Rewards Data</PageTitle>
        <Subtitle>
          Built by a Celsius user. View the{" "}
          <a
            target="__blank"
            href="https://github.com/bonham000/celsius-rewards-explorer"
          >
            source code here
          </a>
          .
        </Subtitle>
        <ChartTitleRow>
          <ChartTitle>
            {chartKeyMap[this.state.chartType].description}
          </ChartTitle>
          <ChartControls>
            <Switch
              style={{
                margin: 0,
                marginRight: 4,
                width: 165,
                textAlign: "left",
              }}
              checked={this.state.viewTopCoins}
              onChange={this.handleToggleViewAll}
              label={
                this.state.viewTopCoins
                  ? "Viewing Top Coins"
                  : "Viewing All Coins"
              }
            />
            <ChartSelect
              items={chartKeys}
              filterable={false}
              activeItem={this.state.chartType}
              onItemSelect={(item) => this.setState({ chartType: item })}
              itemRenderer={(item, { handleClick }) => {
                const isActive = item === this.state.chartType;
                return (
                  <MenuItem
                    disabled={isActive}
                    text={chartKeyMap[item].title}
                    onClick={(e: any) => handleClick(e)}
                  />
                );
              }}
            >
              <Button
                rightIcon="double-caret-vertical"
                text={chartKeyMap[this.state.chartType].title}
              />
            </ChartSelect>
            {!isMobile && DateRangeSelect}
            {!isMobile && (
              <Tooltip2
                position="bottom"
                content="View original CSV row data"
                openOnTargetFocus={false}
              >
                <Button
                  icon="document-open"
                  style={{ marginLeft: 4 }}
                  onClick={this.toggleDrawer}
                />
              </Tooltip2>
            )}
          </ChartControls>
        </ChartTitleRow>
        <ChartContainer>
          {this.state.loading ? (
            <ChartLoading>
              <span>Loading chart data...</span>
            </ChartLoading>
          ) : (
            <ResponsiveContainer width="100%" height={300} minWidth="0">
              <BarChart data={this.getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis fontSize={10} dataKey="coin" />
                <YAxis
                  tickFormatter={(tick) => {
                    return tick.toLocaleString();
                  }}
                  fontSize={10}
                />
                <Tooltip formatter={this.formatTooltipValue("BAR")} />
                <Bar dataKey="value" fill={RANDOM_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
        <ChartTitleRow>{isMobile && DateRangeSelect}</ChartTitleRow>
        <SummaryRow>
          <div>
            <Card
              elevation={Elevation.TWO}
              style={{
                margin: 0,
                minHeight: 300,
                textAlign: "left",
                marginRight: isMobile ? 0 : 24,
                width: isMobile ? "95vw" : 500,
              }}
            >
              <Row style={{ marginBottom: 6 }}>
                <CardTitle>Summary</CardTitle>
                <Button
                  icon="info-sign"
                  text="View More Info"
                  onClick={this.toggleDialog}
                />
              </Row>
              <p>
                <b>Total Users Earning:</b>{" "}
                {this.formatValue(data.stats.totalUsers)}
              </p>
              <p>
                <b>Total Interest Paid in USD:</b> $
                {this.formatValue(data.stats.totalInterestPaidInUsd)}
              </p>
              <p>
                <b>Total Asset Value in USD:</b>
                {this.state.totalAssetValue === null
                  ? " Loading..."
                  : ` $${this.formatValue(String(this.state.totalAssetValue))}`}
              </p>
              <p>
                <b>Annualized 52 Week Interest Yield:</b>
                {this.state.totalAssetValue === null
                  ? " Loading..."
                  : this.getProjectedAnnualYield(
                      data.stats.totalInterestPaidInUsd,
                      this.state.totalAssetValue,
                    )}
              </p>
              <p>
                <b>Average Number of Coins Held Per User:</b>{" "}
                {this.formatValue(data.stats.averageNumberOfCoinsPerUser)}
              </p>
              <p>
                <b>Maximum Single User Portfolio Holdings:</b>{" "}
                {this.formatValue(data.stats.maximumPortfolioSize)}
              </p>
              <p>
                This data represents the Celsius Proof of Community dataset and
                is currently displaying the week of {this.state.dateRange}.
              </p>
            </Card>
          </div>
          <div style={{ marginTop: isMobile ? 24 : 0 }}>
            <Card
              elevation={Elevation.TWO}
              style={{
                minHeight: 300,
                textAlign: "left",
                width: isMobile ? "95vw" : 500,
              }}
            >
              <Row style={{ marginBottom: 6 }}>
                <CardTitle>Celsius Loyalty Tiers</CardTitle>
                <Tooltip2
                  position="top"
                  content={
                    <div style={{ maxWidth: isMobile ? 300 : 500 }}>
                      <p>
                        Many users are labeled with the <code>NONE</code>{" "}
                        loyalty tier, which does not appear to be correct. This
                        is inconsistent with the rewards distribution data and
                        the in-app reported number of "earn in CEL" users, which
                        is over 50%.
                      </p>
                      <p>
                        I counted these by relying on the{" "}
                        <code>loyaltyTier.title</code> field for each user in
                        the CSV file, and doubled checked the logic and results
                        were correct. I may still have made a mistake, but I
                        could not find where.
                      </p>
                    </div>
                  }
                >
                  <Button icon="help" />
                </Tooltip2>
              </Row>
              <PieChart width={isMobile ? 250 : 400} height={200}>
                <Legend
                  align="right"
                  layout="vertical"
                  verticalAlign="middle"
                  formatter={(label) => {
                    // Capitalize label
                    return label[0].toUpperCase() + label.slice(1);
                  }}
                />
                <Tooltip formatter={this.formatTooltipValue("PIE")} />
                <Pie
                  nameKey="tier"
                  dataKey="value"
                  cy={100}
                  cx={isMobile ? 60 : 100}
                  innerRadius={isMobile ? 20 : 30}
                  outerRadius={isMobile ? 60 : 90}
                  data={this.getLoyaltyTiersData()}
                />
              </PieChart>
            </Card>
          </div>
        </SummaryRow>
      </Page>
    );
  }

  formatTooltipValue = (chart: "BAR" | "PIE") => (value: string) => {
    const formattedValue = this.formatValue(value);

    if (chart === "PIE") {
      return `${formattedValue} users`;
    }

    switch (this.state.chartType) {
      case "interest_paid":
      case "total": {
        return `$${formattedValue}`;
      }
      case "number_of_users":
      case "earning_in_cel": {
        return `${formattedValue} users`;
      }
    }
  };

  getCurrentDataSet = (): CelsiusRewardsDataType => {
    // Return the data set at the currently selected date range.
    const { dateRange } = this.state;
    const data = rewardsDataMap.get(dateRange);
    if (data) {
      return data;
    } else {
      this.toast(
        "No date found for this date range. Check the console for more info.",
        "error",
      );
      throw new Error(
        `No data found for date range key: ${dateRange}. Are you sure this dataset exists and is imported correctly?`,
      );
    }
  };

  getCoinPortfolioEntries = () => {
    const data = this.getCurrentDataSet();
    const portfolio = Object.entries(data.portfolio);
    return portfolio;
  };

  calculateTotalAssetValue = () => {
    const { coinPriceMap } = this.state;
    const dataset = this.getCoinPortfolioEntries();

    let sum = 0;

    for (const [coin, values] of dataset) {
      // Calculate actual USD value using price data
      const total = parseFloat(values.total);
      const price = coinPriceMap[coin];
      const value = total * price;

      sum += value;
    }

    this.setState({ totalAssetValue: sum });
  };

  getChartData = () => {
    const { chartType, coinPriceMap } = this.state;
    let chart = [];

    const portfolio = this.getCoinPortfolioEntries();

    switch (chartType) {
      case "total": {
        for (const [coin, values] of portfolio) {
          // Calculate actual USD value using price data
          const total = parseFloat(values.total);
          const price = coinPriceMap[coin];
          const value = total * price;
          chart.push({ coin, value });
        }
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
    }

    const sortedResult = chart.sort((a, b) => b.value - a.value);

    if (this.state.viewTopCoins) {
      // Limit to less on mobile
      const limit = isMobile ? 10 : 20;
      return sortedResult.slice(0, limit);
    } else {
      return sortedResult;
    }
  };

  getLoyaltyTiersData = () => {
    const data = this.getCurrentDataSet();
    const tiers = Object.entries(data.loyaltyTierSummary).map(
      ([key, value]) => {
        const color = loyaltyTierColors[key as keyof typeof loyaltyTierColors];
        return {
          tier: key,
          value,
          fill: color,
        };
      },
    );
    return tiers;
  };

  handleToggleViewAll = () => {
    this.setState((prevState) => ({
      viewTopCoins: !prevState.viewTopCoins,
    }));
  };

  toggleDialog = () => {
    this.setState((prevState) => ({
      dialogOpen: !prevState.dialogOpen,
    }));
  };

  toggleDrawer = () => {
    this.setState((prevState) => ({
      drawerOpen: !prevState.drawerOpen,
    }));
  };

  toast = (message: string, type?: "warning" | "error") => {
    const className =
      type === "warning"
        ? Classes.INTENT_WARNING
        : type === "error"
        ? Classes.INTENT_DANGER
        : "";

    AppToaster.show({ message, className });
  };

  formatValue = (value: string) => {
    const options = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    };

    return parseFloat(value).toLocaleString("en", options);
  };

  getProjectedAnnualYield = (
    totalInterestPaid: any,
    totalAssetValue: number,
  ) => {
    const interest = parseFloat(totalInterestPaid) / totalAssetValue;
    const annualized = interest * 52;
    const percent = annualized * 100;
    const label = ` ${percent.toFixed(2)}%`;
    return label;
  };
}

/** ===========================================================================
 * Styles
 * ============================================================================
 */

const loyaltyTierColors = {
  platinum: "rgb(161, 167, 195)",
  gold: "rgb(206, 165, 98)",
  silver: "rgb(214, 214, 214)",
  bronze: "rgb(254, 189, 149)",
  none: "rgb(50, 50, 50)",
};

const colors = [
  "rgb(15, 27, 100)",
  "rgb(112, 31, 191)",
  "rgb(112, 31, 185)",
  "rgb(188, 62, 179)",
  "rgb(215, 64, 176)",
  "rgb(244, 65, 171)",
];

const getColor = () => {
  return colors[Math.floor(Math.random() * colors.length)];
};

const RANDOM_COLOR = getColor();

export const MOBILE = `(max-width: 768px)`;

const Page = styled.div`
  padding: 75px;
  padding-top: 15px;
  padding-bottom: 0;

  @media ${MOBILE} {
    padding: 8px;
    padding-bottom: 50px;
  }
`;

const PageTitle = styled.h1`
  font-weight: 600;
  margin-bottom: 4px;
`;

const Subtitle = styled.p`
  font-size: 12px;
`;

const CardTitle = styled.h2`
  margin-top: 2px;
  margin-bottom: 2px;
`;

const ChartTitle = styled.h3`
  margin: 0;
  margin-left: 2px;
`;

const ChartControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;

  @media ${MOBILE} {
    margin-top: 12px;
  }
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 100%;
`;

const ChartLoading = styled.div`
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ChartTitleRow = styled.div`
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

const SummaryRow = styled.div`
  padding-left: 60px;
  margin-top: 25px;
  display: flex;
  align-items: center;
  flex-direction: row;

  @media ${MOBILE} {
    padding: 0px;
    flex-direction: column;
    justify-content: center;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
`;

const RightSide = styled.div`
  padding-top: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

/** ===========================================================================
 * Export
 * ============================================================================
 */

export default Main;
