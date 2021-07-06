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
  Toast,
  Icon,
} from "@blueprintjs/core";
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
  Line,
  LineChart,
} from "recharts";
import originalCSV from "../data/csv-row-sample.json";
import JSONPretty from "react-json-pretty";
import {
  getPortfolioSelectText,
  Page,
  DialogBodyContent,
  RightSide,
  PageTitle,
  Subtitle,
  ChartTitleRow,
  ChartTitle,
  ChartControls,
  ChartContainer,
  ChartLoading,
  RANDOM_COLOR,
  SummaryRow,
  Row,
  CardTitle,
  PortfolioContainer,
  portfolioPieColors,
  CoinHoldingsControls,
  loyaltyTierColors,
  earnInCelTooltipContent,
  loyaltyTiersTooltipContent,
  topHoldersTooltipContent,
} from "./Components";
import {
  chartKeyMap,
  formatValue,
  copyToClipboard,
  getProjectedAnnualYield,
  fetchCoinPriceAsync,
  readCachedCoinPriceData,
  CoinPriceMap,
  CelsiusRewardsDataType,
  cacheCoinPriceMap,
  PortfolioAllocations,
  handleGetChartData,
  ChartType,
  chartKeys,
  renderCustomPieChartLabel,
  handleFormatTooltipValue,
  rankingsArray,
  Nullable,
  TimeLapseChartView,
  handleGetPortfolioTimeLapseData,
} from "./utils";
import { dateRanges, DateRangesType, getRewardsDataMap } from "./rewards";

/** ===========================================================================
 * Types & Config
 * ============================================================================
 */

// Disable focus styles when clicking Blueprint elements
FocusStyleManager.onlyShowFocusOnTabs();

export type PortfolioView = "all" | "top" | "bottom";

const DateSelect = Select.ofType<DateRangesType>();
const ChartSelect = Select.ofType<ChartType>();
const PortfolioSelect = Select.ofType<PortfolioView>();
const CoinDistributionSelect = Select.ofType<string>();
const TimeLapseSelect = Select.ofType<string>();

interface IState {
  toasts: any[];
  loading: boolean;
  dialogOpen: boolean;
  viewTopCoins: boolean;
  chartType: ChartType;
  coinPriceMap: CoinPriceMap;
  dateRange: DateRangesType;
  drawerOpen: boolean;
  totalAssetValue: number | null;
  portfolioView: PortfolioView;
  timeLapseChartSelection: string;
  displayFiatInDistributionChart: boolean;
  coinDistributionChartSelection: string;
  timeLapseChartView: TimeLapseChartView;
  portfolioAllocations: PortfolioAllocations;
  currentPortfolioAllocation: PortfolioAllocations;
}

// Initialize the rewards data
const rewardsDataMap = getRewardsDataMap();

/** ===========================================================================
 * App Component
 * ============================================================================
 */

export default class App extends React.Component<{}, IState> {
  toaster: Nullable<Toaster>;

  refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  constructor(props: {}) {
    super(props);

    this.toaster = null;

    this.state = {
      toasts: [],
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
      timeLapseChartView: "tokens",
      displayFiatInDistributionChart: false,
      timeLapseChartSelection: "CEL",
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
    const dataset = this.getCurrentDataSet();
    const coinPriceMap = readCachedCoinPriceData(dataset);
    if (coinPriceMap) {
      this.setState(
        { loading: false, coinPriceMap },
        this.calculateTotalAssetsAndPortfolio,
      );
      return "success";
    } else {
      return "failure";
    }
  };

  fetchCoinPriceData = async () => {
    // Fetch all price data for current dataset
    const data = this.getCurrentDataSet();
    const coins = Object.keys(data.portfolio);

    // Fetch the price for each coin
    const prices = await Promise.all(coins.map(fetchCoinPriceAsync));

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
      cacheCoinPriceMap(this.state.coinPriceMap);
      this.calculateTotalAssetsAndPortfolio();
    });
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
        itemPredicate={(query, item) =>
          item.toLowerCase().includes(query.toLowerCase())
        }
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
        <Toaster position={Position.TOP_RIGHT} ref={this.refHandlers.toaster}>
          {this.state.toasts.map((toast) => (
            <Toast {...toast} />
          ))}
        </Toaster>
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
                <Tooltip formatter={this.formatTooltipValue("bar")} />
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
                <b>Total Users Earning:</b> {formatValue(data.stats.totalUsers)}
              </p>
              <p>
                <b>Total Users Earning in CEL:</b>{" "}
                {formatValue(data.stats.totalUsersEarningInCel)}
                <Tooltip2 position="top" content={earnInCelTooltipContent}>
                  <Icon style={{ marginLeft: 4 }} icon="error" />
                </Tooltip2>
              </p>
              <p>
                <b>Total Interest Paid in USD:</b> $
                {formatValue(data.stats.totalInterestPaidInUsd)}
              </p>
              <p>
                <b>Total Asset Value in USD:</b>
                {this.state.totalAssetValue === null
                  ? " Loading..."
                  : ` $${formatValue(String(this.state.totalAssetValue))}`}
              </p>
              <p>
                <b>Annualized 52 Week Interest Yield:</b>
                {this.state.totalAssetValue === null
                  ? " Loading..."
                  : getProjectedAnnualYield(
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
                <Tooltip2 position="top" content={loyaltyTiersTooltipContent}>
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
                <Tooltip formatter={this.formatTooltipValue("pie")} />
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
                <Tooltip formatter={this.formatTooltipValue("portfolio")} />
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
                    {`$${formatValue(String(this.state.totalAssetValue))}`}
                  </p>
                  <p>
                    <b>Total Coins Held:</b>{" "}
                    {formatValue(this.state.portfolioAllocations.length)}
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
                    {formatValue(data.stats.averageNumberOfCoinsPerUser)}
                  </p>
                  <p>
                    <b>Maximum Single User Portfolio Holdings:</b>{" "}
                    {formatValue(data.stats.maximumPortfolioSize)}
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
            <Tooltip2 position="top" content={topHoldersTooltipContent}>
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
                  fontSize={10}
                  dataKey="coin"
                  tickFormatter={() => ""}
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
                    formatter={this.formatTooltipValue("distribution")}
                  />
                )}
                <Bar
                  dataKey="value"
                  fill={RANDOM_COLOR}
                  onClick={this.handleClickDistributionBar}
                />
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
                    {formatValue(
                      data.portfolio[this.state.coinDistributionChartSelection]
                        .numberOfUsersHolding,
                    )}{" "}
                    users hold {this.state.coinDistributionChartSelection}.
                  </Subtitle>
                  <Subtitle>
                    Breakdown of top holders at various levels:
                  </Subtitle>
                  {rankingsArray.map((item) => {
                    const [title, key] = item;
                    const { coinPriceMap, coinDistributionChartSelection } =
                      this.state;

                    const coin = coinDistributionChartSelection;
                    const price = coinPriceMap[coin];
                    const levels = data.coinDistributionsLevels;
                    const amount = levels[coinDistributionChartSelection][key];
                    const usdValue = price * parseFloat(amount);
                    const formattedAmount = formatValue(amount, 2);
                    const formattedValue = formatValue(usdValue);
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
                    <CardTitle>Weekly Reward Rankings</CardTitle>
                  </Row>
                  <Subtitle>Rankings for top earning users.</Subtitle>
                  {rankingsArray.map((item) => {
                    const [title, key] = item;
                    const rankings = data.interestEarnedRankings;
                    const value = rankings[key];
                    const formattedValue = formatValue(value, 2);
                    const label = `$${formattedValue}`;
                    return (
                      <p>
                        <b>{title}:</b> {`${label}`}
                      </p>
                    );
                  })}
                  <p>
                    <b>Average Interest Per User:</b> $
                    {formatValue(data.stats.averageInterestPerUser, 2)}
                  </p>
                  <p>
                    <b>Annualized Average Interest Per User:</b> $
                    {formatValue(
                      parseFloat(data.stats.averageInterestPerUser) * 52,
                      2,
                    )}
                  </p>
                </>
              </Card>
            </>
          )}
        </SummaryRow>
        {/* Enable this in the future to display the time lapse chart,
            e.g. when we have more data series to view. */}
        {2 > 3 && this.renderTimeLapsePortfolioChart()}
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

  renderCustomizedLabel = (args: any) => {
    const { currentPortfolioAllocation } = this.state;
    return renderCustomPieChartLabel(args, currentPortfolioAllocation);
  };

  handleClickDistributionBar = (data: any) => {
    const { uuid } = data.payload;
    copyToClipboard(uuid);
    this.toast(`"${uuid}" copied to clipboard.`);
  };

  formatTooltipValue =
    (chart: "bar" | "pie" | "portfolio" | "distribution" | "timelapse") =>
    (value: string, _: any, item: any) => {
      const { chartType, displayFiatInDistributionChart } = this.state;
      const displayFiat = displayFiatInDistributionChart;
      return handleFormatTooltipValue({
        item,
        value,
        chart,
        chartType,
        displayFiat,
      });
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
    const { chartType, viewTopCoins, portfolioAllocations } = this.state;
    const portfolio = this.getCoinPortfolioEntries();
    return handleGetChartData({
      chartType,
      portfolio,
      viewTopCoins,
      portfolioAllocations,
    });
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

  handleToggleTimeLapseChartView = () => {
    this.setState((prevState) => ({
      timeLapseChartView:
        prevState.timeLapseChartView === "tokens" ? "holders" : "tokens",
    }));
  };

  toast = (message: string, type?: "warning" | "error") => {
    const className =
      type === "warning"
        ? Classes.INTENT_WARNING
        : type === "error"
        ? Classes.INTENT_DANGER
        : "";

    if (this.toaster) {
      this.toaster.show({ message, className });
    }
  };

  getPortfolioTimeLapseData = () => {
    const { timeLapseChartSelection, timeLapseChartView } = this.state;
    return handleGetPortfolioTimeLapseData({
      rewardsDataMap,
      chartView: timeLapseChartView,
      chartSelection: timeLapseChartSelection,
    });
  };

  renderTimeLapsePortfolioChart = () => {
    const timeLapseData = this.getPortfolioTimeLapseData();
    return (
      <div style={{ marginTop: 24, marginBottom: 48 }}>
        <PageTitle>Coin Holding Time Lapse</PageTitle>
        <Subtitle>View how asset holdings change over time.</Subtitle>
        <CoinHoldingsControls>
          <Switch
            style={{
              margin: 0,
              marginRight: 4,
              width: 225,
              textAlign: "left",
            }}
            checked={this.state.timeLapseChartView === "tokens"}
            onChange={this.handleToggleTimeLapseChartView}
            label={
              this.state.timeLapseChartView === "tokens"
                ? "Viewing Token Holdings"
                : "Viewing Number of Holders"
            }
          />
          <TimeLapseSelect
            filterable={!isMobile}
            popoverProps={{
              popoverClassName: "coin-distribution-select",
            }}
            items={this.getSortedDistributionSelectMenuOptions()}
            activeItem={this.state.timeLapseChartSelection}
            onItemSelect={(item) => {
              this.setState({ timeLapseChartSelection: item });
            }}
            itemPredicate={(query, item) => {
              return item.toLowerCase().includes(query.toLowerCase());
            }}
            itemRenderer={(item, { handleClick }) => {
              const isActive = item === this.state.timeLapseChartSelection;
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
              text={this.state.timeLapseChartSelection}
            />
          </TimeLapseSelect>
        </CoinHoldingsControls>
        <ChartContainer style={{ marginTop: 6 }}>
          <ResponsiveContainer width="100%" height={600} minWidth="0">
            <LineChart
              width={730}
              height={250}
              data={timeLapseData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={this.formatTooltipValue("timelapse")} />
              {Object.entries(timeLapseData[0])
                .filter((item) => item[0] !== "date")
                .map((coinItem, index) => {
                  const coin = coinItem[0];
                  return (
                    <Line
                      type="monotone"
                      dataKey={coin}
                      stroke={portfolioPieColors[index]}
                    />
                  );
                })}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  };
}
