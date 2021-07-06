import React from "react";
import { isMobile } from "react-device-detect";
import { Tooltip2 } from "@blueprintjs/popover2";
import {
  Button,
  Card,
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
  Cell,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import rewards_01 from "../data/01-rewards.json";
import rewards_02 from "../data/02-rewards.json";
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

interface CoinDistributionLevels {
  topOne: string;
  topTen: string;
  topHundred: string;
  topThousand: string;
  topTenThousand: string;
}

interface InterestEarnedRankings {
  topOne: string;
  topTen: string;
  topHundred: string;
  topThousand: string;
  topTenThousand: string;
}

type CoinDistribution = Array<string[]>;
type CoinDistributions = { [coin: string]: CoinDistribution };
type CoinDistributionLevelsMap = { [coin: string]: CoinDistributionLevels };

interface CelsiusRewardsDataType {
  portfolio: Portfolio;
  coinDistributions: CoinDistributions;
  coinDistributionsLevels: CoinDistributionLevelsMap;
  interestEarnedRankings: InterestEarnedRankings;
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

type PortfolioAllocations = Array<{
  coin: string;
  value: number;
  numberOfCoins: number;
}>;

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

/**
 * Add more date ranges here for future weekly datasets.
 */
type DateRangesType =
  | "June 18, 2021 - June 25, 2021"
  | "June 25, 2021 - July 2, 2021";

const dateRanges: DateRangesType[] = [
  "June 18, 2021 - June 25, 2021",
  "June 25, 2021 - July 2, 2021",
];

const rewardsDataMap: Map<DateRangesType, CelsiusRewardsDataType> = new Map();

/**
 * Initialize map with data. This is where the DATE_IDENTIFIER values
 * from the csv script get mapped to specific date ranges which the
 * app can understand.
 *
 * Add additional rewards data here in the future when needed.
 */
rewardsDataMap.set(dateRanges[0], rewards_01);
rewardsDataMap.set(dateRanges[1], rewards_02);

type PortfolioView = "all" | "top" | "bottom";

const DateSelect = Select.ofType<DateRangesType>();
const ChartSelect = Select.ofType<ChartType>();
const PortfolioSelect = Select.ofType<PortfolioView>();
const CoinDistributionSelect = Select.ofType<string>();

interface IState {
  loading: boolean;
  dialogOpen: boolean;
  viewTopCoins: boolean;
  chartType: ChartType;
  coinPriceMap: CoinPriceMap;
  dateRange: DateRangesType;
  drawerOpen: boolean;
  totalAssetValue: number | null;
  portfolioView: PortfolioView;
  displayFiatInDistributionChart: boolean;
  coinDistributionChartSelection: string;
  portfolioAllocations: PortfolioAllocations;
  currentPortfolioAllocation: PortfolioAllocations;
}

/** ===========================================================================
 * Main Component
 * ----------------------------------------------------------------------------
 * This is a big file. If it grows any more it might be worth refactoring it
 * to reduce the size.
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
      portfolioView: "all",
      portfolioAllocations: [],
      currentPortfolioAllocation: [],
      displayFiatInDistributionChart: false,
      coinDistributionChartSelection: "CEL",
      dateRange: dateRanges[dateRanges.length - 1],
    };
  }

  async componentDidMount() {
    this.initializePriceData();
  }

  /**
   * Handle initalizing the price data. This relies on the CoinGecko API,
   * so the data is cached locally for UX and to avoid getting rate limited.
   *
   * This method is called again if the user switches the date range to view
   * another dataset, because the new dataset may include new coins which
   * have no previous price data.
   *
   * It would be better to have a standardized list of coins which Celsius
   * supports and allows fetch prices for only these coins.
   */
  initializePriceData = () => {
    this.setState({ loading: true }, () => {
      // First try to restore price data from local cache
      const didRestorePriceDataFromCache = this.restorePriceDataFromCache();

      // If restoring from the cache, fetch the data.
      if (didRestorePriceDataFromCache === "failure") {
        console.log(
          "Price cache expired or doesn't exist, fetching new prices...",
        );
        this.fetchCoinPriceData();
      }
    });
  };

  restorePriceDataFromCache = (): "success" | "failure" => {
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

        const dataset = this.getCurrentDataSet();
        const coins = Object.keys(dataset.portfolio);

        // Bust the cache if the dataset has a coin not found in the cache.
        for (const coin of coins) {
          if (!(coin in coinPriceMap)) {
            console.warn(`Found missing coin in cached data: ${coin}.`);
            return "failure";
          }
        }

        // Ensure we are still within the 6 hour window
        if (elapsed <= sixHoursInMilliseconds) {
          console.log("Using cached price data.");
          this.setState(
            { loading: false, coinPriceMap },
            this.calculateTotalAssetsAndPortfolio,
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
      this.calculateTotalAssetsAndPortfolio();
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
    const coinHoldersDistribution = this.getHoldersDistributionData();
    const { currentPortfolioAllocation } = this.state;

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
           * previous dataset. If that happens we want to re-fetch
           * coin prices here.
           */
          this.setState({ dateRange: item }, this.initializePriceData);
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
        />
      </DateSelect>
    );

    const ChartSelectMenu = (
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
    );

    const PortfolioSelectMenu = (
      <PortfolioSelect
        items={["all", "top", "bottom"]}
        filterable={false}
        activeItem={this.state.portfolioView}
        onItemSelect={(item) =>
          this.setState(
            { portfolioView: item },
            this.setCurrentPortfolioAllocations,
          )
        }
        itemRenderer={(item, { handleClick }) => {
          const isActive = item === this.state.portfolioView;
          return (
            <MenuItem
              disabled={isActive}
              text={getPortfolioSelectText(item)}
              onClick={(e: any) => handleClick(e)}
            />
          );
        }}
      >
        <Button
          rightIcon="double-caret-vertical"
          text={getPortfolioSelectText(this.state.portfolioView)}
        />
      </PortfolioSelect>
    );

    const CoinDistributionSelectMenu = (
      <CoinDistributionSelect
        filterable={!isMobile}
        popoverProps={{
          popoverClassName: "coin-distribution-select",
        }}
        items={this.getSortedDistributionSelectMenuOptions()}
        activeItem={this.state.coinDistributionChartSelection}
        onItemSelect={(item) => {
          this.setState({ coinDistributionChartSelection: item });
        }}
        itemPredicate={(query, item) => {
          return item.toLowerCase().includes(query.toLowerCase());
        }}
        itemRenderer={(item, { handleClick }) => {
          const isActive = item === this.state.coinDistributionChartSelection;
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
          rightIcon="caret-down"
          text={this.state.coinDistributionChartSelection}
        />
      </CoinDistributionSelect>
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
            {DialogBodyContent}
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
            {ChartSelectMenu}
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
                  tickFormatter={(tick) => tick.toLocaleString()}
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
                <b>Total Users Earning in CEL:</b>{" "}
                {this.formatValue(data.stats.totalUsersEarningInCel)}
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
                The data on this page is compiled from the recently launched{" "}
                <a target="__blank" href="https://youtu.be/XIMQKJXUke8">
                  Celsius Proof of Community
                </a>{" "}
                feature, which summarizes the weekly Celsius rewards
                distributions.
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
                  // capitalize the label
                  formatter={(label) => label[0].toUpperCase() + label.slice(1)}
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
        <div style={{ marginTop: 48 }}>
          <PageTitle>Celsian HODLers Portfolio</PageTitle>
          <Subtitle>
            The total portfolio breakdown of all Celsius users.
          </Subtitle>
          {PortfolioSelectMenu}
          <PortfolioContainer>
            <ResponsiveContainer
              width="100%"
              height={isMobile ? 450 : 500}
              minWidth="0"
            >
              <PieChart
                width={isMobile ? 250 : 400}
                height={isMobile ? 200 : 400}
              >
                <Tooltip formatter={this.formatTooltipValue("PORTFOLIO")} />
                <Pie
                  cx={isMobile ? "50%" : "55%"}
                  cy="50%"
                  nameKey="coin"
                  dataKey="value"
                  labelLine={false}
                  isAnimationActive={false}
                  innerRadius={isMobile ? 60 : 80}
                  outerRadius={isMobile ? 160 : 240}
                  data={currentPortfolioAllocation}
                  label={this.renderCustomizedLabel}
                >
                  {currentPortfolioAllocation.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        portfolioPieColors[index % portfolioPieColors.length]
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Card
              elevation={Elevation.TWO}
              style={{
                minHeight: 300,
                textAlign: "left",
                marginRight: isMobile ? 0 : 50,
                width: isMobile ? "95vw" : 600,
              }}
            >
              <Row style={{ marginBottom: 6 }}>
                <CardTitle>Portfolio Stats</CardTitle>
              </Row>
              {this.state.portfolioAllocations.length === 0 ? (
                "Loading..."
              ) : (
                <>
                  <p>
                    <b>Total Portfolio Value:</b>{" "}
                    {`$${this.formatValue(String(this.state.totalAssetValue))}`}
                  </p>
                  <p>
                    <b>Total Coins Held:</b>{" "}
                    {this.formatValue(this.state.portfolioAllocations.length)}
                  </p>
                  <p>
                    <b>Most Held Coin:</b>{" "}
                    {this.state.portfolioAllocations[0].coin}
                  </p>
                  <p>
                    <b>Least Held Coin:</b>{" "}
                    {
                      this.state.portfolioAllocations[
                        this.state.portfolioAllocations.length - 1
                      ].coin
                    }
                  </p>
                  <p>
                    <b>Average Number of Coins Held Per User:</b>{" "}
                    {this.formatValue(data.stats.averageNumberOfCoinsPerUser)}
                  </p>
                  <p>
                    <b>Maximum Single User Portfolio Holdings:</b>{" "}
                    {this.formatValue(data.stats.maximumPortfolioSize)}
                  </p>
                </>
              )}
            </Card>
          </PortfolioContainer>
        </div>
        <div style={{ marginTop: 24, marginBottom: 48 }}>
          <PageTitle>Top Holders Overview by Coin</PageTitle>
          <Subtitle>An overview of the top holders for each coin.</Subtitle>
          <CoinHoldingsControls>
            <Switch
              style={{
                margin: 0,
                marginRight: 4,
                width: 225,
                textAlign: "left",
              }}
              checked={this.state.displayFiatInDistributionChart}
              onChange={this.handleToggleDisplayFiat}
              label={
                this.state.displayFiatInDistributionChart
                  ? "Viewing USD Amount"
                  : "Viewing Total Coin Holdings"
              }
            />
            {CoinDistributionSelectMenu}
            <Tooltip2
              position="top"
              content={
                <div style={{ maxWidth: isMobile ? 300 : 500 }}>
                  <p>
                    Only the top 100 holders are displayed. This is because the
                    distribution is dramatically skewed by the top 1-3 whales
                    and a long tail of very small holders. The overall number of
                    holders is also huge, which can be unwieldy to work with and
                    visualize. Limiting to the top 100 is more practical and
                    still provides useful insights.
                  </p>
                </div>
              }
            >
              <Button style={{ marginLeft: 8 }} icon="help" />
            </Tooltip2>
          </CoinHoldingsControls>
          <ChartContainer style={{ marginTop: 6 }}>
            <ResponsiveContainer width="100%" height={600} minWidth="0">
              <BarChart data={coinHoldersDistribution}>
                <CartesianGrid strokeDasharray="3 1" />
                <XAxis
                  interval={8}
                  tickLine={false}
                  tickFormatter={() => ""}
                  fontSize={10}
                  dataKey="coin"
                  label={`Top 100 ${this.state.coinDistributionChartSelection} holders`}
                />
                <YAxis
                  tickCount={10}
                  domain={[
                    0,
                    Math.ceil(parseFloat(coinHoldersDistribution[0].value)),
                  ]}
                  tickFormatter={(tick) => tick.toLocaleString()}
                  fontSize={10}
                />
                {!isMobile && (
                  <Tooltip
                    formatter={this.formatTooltipValue("DISTRIBUTION")}
                  />
                )}
                <Bar dataKey="value" fill={RANDOM_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        <SummaryRow style={{ marginBottom: 75 }}>
          {this.state.loading ? (
            <div style={{ height: 200 }}>
              <span>Loading...</span>
            </div>
          ) : (
            <>
              <Card
                elevation={Elevation.TWO}
                style={{
                  minHeight: 300,
                  textAlign: "left",
                  marginRight: isMobile ? 0 : 24,
                  width: isMobile ? "95vw" : 400,
                }}
              >
                <>
                  <Row style={{ marginBottom: 6 }}>
                    <CardTitle>
                      {this.state.coinDistributionChartSelection} Coin Rankings
                    </CardTitle>
                    {CoinDistributionSelectMenu}
                  </Row>
                  <Subtitle>
                    {this.formatValue(
                      data.portfolio[this.state.coinDistributionChartSelection]
                        .numberOfUsersHolding,
                    )}{" "}
                    users hold {this.state.coinDistributionChartSelection}.
                  </Subtitle>
                  <Subtitle>
                    Breakdown of top holders at various levels:
                  </Subtitle>
                  {[
                    ["Top 1", "topOne"],
                    ["Top 10", "topTen"],
                    ["Top 100", "topHundred"],
                    ["Top 1,000", "topThousand"],
                    ["Top 10,000", "topTenThousand"],
                  ].map((item) => {
                    const [title, key] = item as [
                      string,
                      keyof CoinDistributionLevels,
                    ];
                    const { coinPriceMap, coinDistributionChartSelection } =
                      this.state;

                    const coin = coinDistributionChartSelection;
                    const price = coinPriceMap[coin];
                    const levels = data.coinDistributionsLevels;
                    const amount = levels[coinDistributionChartSelection][key];
                    const usdValue = price * parseFloat(amount);
                    const formattedAmount = this.formatValue(amount, 2);
                    const formattedValue = this.formatValue(usdValue);
                    const label = `${formattedAmount} tokens ($${formattedValue})`;
                    return (
                      <p>
                        <b>{title}:</b> {`${label}`}
                      </p>
                    );
                  })}
                </>
              </Card>
              <Card
                elevation={Elevation.TWO}
                style={{
                  minHeight: 300,
                  textAlign: "left",
                  marginTop: isMobile ? 24 : "auto",
                  width: isMobile ? "95vw" : 400,
                }}
              >
                <>
                  <Row style={{ marginBottom: 6 }}>
                    <CardTitle>Yield Stats</CardTitle>
                  </Row>
                  <Subtitle>Rankings for top earning users.</Subtitle>
                  {[
                    ["Top 1", "topOne"],
                    ["Top 10", "topTen"],
                    ["Top 100", "topHundred"],
                    ["Top 1,000", "topThousand"],
                    ["Top 10,000", "topTenThousand"],
                  ].map((item) => {
                    const [title, key] = item as [
                      string,
                      keyof CoinDistributionLevels,
                    ];
                    const rankings = data.interestEarnedRankings;
                    const value = rankings[key];
                    const formattedValue = this.formatValue(value, 2);
                    const label = `$${formattedValue}`;
                    return (
                      <p>
                        <b>{title}:</b> {`${label}`}
                      </p>
                    );
                  })}
                  <p>
                    <b>Average Interest Per User:</b> $
                    {this.formatValue(data.stats.averageInterestPerUser, 2)}
                  </p>
                  <p>
                    <b>Annualized Average Interest Per User:</b> $
                    {this.formatValue(
                      parseFloat(data.stats.averageInterestPerUser) * 52,
                      2,
                    )}
                  </p>
                </>
              </Card>
            </>
          )}
        </SummaryRow>
      </Page>
    );
  }

  setCurrentPortfolioAllocations = () => {
    const { portfolioView, portfolioAllocations } = this.state;
    let result;
    switch (portfolioView) {
      case "all":
        result = portfolioAllocations;
        break;
      case "top":
        result = portfolioAllocations.slice(0, 15);
        break;
      case "bottom":
        result = portfolioAllocations.slice(20);
        break;
    }

    this.setState({ currentPortfolioAllocation: result });
  };

  renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }: any) => {
    const { currentPortfolioAllocation } = this.state;
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

  formatTooltipValue =
    (chart: "BAR" | "PIE" | "PORTFOLIO" | "DISTRIBUTION") =>
    (value: string, _: any, item: any) => {
      const { displayFiatInDistributionChart } = this.state;
      const formattedValue = this.formatValue(value);

      if (chart === "PIE") {
        return `${formattedValue} users`;
      } else if (chart === "PORTFOLIO") {
        return `$${formattedValue}`;
      } else if (chart === "DISTRIBUTION") {
        const { uuid } = item.payload;
        if (displayFiatInDistributionChart) {
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
      }

      switch (this.state.chartType) {
        case "total": {
          const { coin, numberOfCoins } = item.payload;
          return (
            <span>
              ${formattedValue}
              <br />
              {this.formatValue(numberOfCoins)} total {coin}
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

  calculateTotalAssetsAndPortfolio = () => {
    const { coinPriceMap } = this.state;
    const dataset = this.getCoinPortfolioEntries();

    let sum = 0;
    const allocations: PortfolioAllocations = [];

    for (const [coin, values] of dataset) {
      // Calculate actual USD value using price data
      const total = parseFloat(values.total);
      const price = coinPriceMap[coin];
      const value = total * price;

      allocations.push({ coin, value, numberOfCoins: total });

      sum += value;
    }

    this.setState(
      {
        totalAssetValue: sum,
        portfolioAllocations: allocations,
      },
      this.setCurrentPortfolioAllocations,
    );
  };

  getHoldersDistributionData = () => {
    const {
      coinPriceMap,
      coinDistributionChartSelection,
      displayFiatInDistributionChart,
    } = this.state;

    const useFiat = displayFiatInDistributionChart;
    const coin = coinDistributionChartSelection;
    const price = coinPriceMap[coin];
    const data = this.getCurrentDataSet();
    const { coinDistributions } = data;
    const distributions = coinDistributions[coin];

    return distributions.map(([uuid, amount]) => ({
      coin,
      uuid,
      value: useFiat ? String(parseFloat(amount) * price) : amount,
    }));
  };

  getChartData = () => {
    const { chartType, portfolioAllocations } = this.state;
    let chart = [];

    const portfolio = this.getCoinPortfolioEntries();

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
    }

    // Sort by value
    const sortedResult = chart.sort((a, b) => b.value - a.value);

    if (this.state.viewTopCoins) {
      // Limit to less on mobile
      const limit = isMobile ? 10 : 20;
      return sortedResult.slice(0, limit);
    } else {
      return sortedResult;
    }
  };

  getSortedDistributionSelectMenuOptions = () => {
    // Just sort the portfolio allocations and return the list of coin keys
    return this.state.portfolioAllocations
      .sort((a, b) => b.value - a.value)
      .map((x) => x.coin);
  };

  getLoyaltyTiersData = () => {
    const data = this.getCurrentDataSet();
    const tiers = Object.entries(data.loyaltyTierSummary).map(
      ([key, value]) => {
        const color = loyaltyTierColors[key as keyof typeof loyaltyTierColors];
        return {
          tier: key,
          fill: color,
          value: parseFloat(value),
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

  handleToggleDisplayFiat = () => {
    this.setState((prevState) => ({
      displayFiatInDistributionChart: !prevState.displayFiatInDistributionChart,
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

  formatValue = (value: string | number, decimals?: number) => {
    const stringValue: string =
      typeof value === "number" ? String(value) : value;

    const options = {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0,
    };

    return parseFloat(stringValue).toLocaleString("en", options);
  };

  getProjectedAnnualYield = (
    totalInterestPaid: string,
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

const portfolioPieColors = [
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

const CelsiusColors = [
  "rgb(15, 27, 100)",
  "rgb(112, 31, 191)",
  "rgb(112, 31, 185)",
  "rgb(188, 62, 179)",
  "rgb(215, 64, 176)",
  "rgb(244, 65, 171)",
];

const getColor = () => {
  return CelsiusColors[Math.floor(Math.random() * CelsiusColors.length)];
};

const RANDOM_COLOR = getColor();

const getPortfolioSelectText = (view: PortfolioView) => {
  let text = "";
  if (view === "all") {
    text = "View all coins";
  } else if (view === "top") {
    text = "View most held 15 coins only";
  } else {
    text = "View least held 20 coins only";
  }
  return text;
};

const MOBILE = `(max-width: 768px)`;

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

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
`;

const PortfolioContainer = styled.div`
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

const RightSide = styled.div`
  padding-top: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const CoinHoldingsControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

const DialogBodyContent = (
  <>
    <b>Observations:</b>
    <p>
      • There is a strong preference for users to earn in CEL. Over 75% of BTC
      holders, which is the largest coin holding (CEL is 2nd), are earning in
      CEL.
    </p>
    <p>
      • All of the charts appear to follow a power law distribution, with most
      of users concentrated around a few coins and a long tail of smaller coins
      with few holders.{" "}
    </p>
    <p>
      • The smallest coins have very few users, e.g. ZUSD only has 3 holders.
    </p>
    <p>• The top coin holdings are, unsurprisingly, BTC, ETH, CEL, and USDC.</p>
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
    <b>By the Way:</b>
    <p>
      • If you happen to know anyone at Celsius, I am interested in working for
      them,{" "}
      <a target="__blank" href="mailto:sean.smith.2009@gmail.com">
        you can reach me here
      </a>{" "}
      🙂
    </p>
  </>
);

/** ===========================================================================
 * Export
 * ============================================================================
 */

export default Main;
