import React from "react";
import { isMobile } from "react-device-detect";
import {
  Button,
  Card,
  Classes,
  Dialog,
  Elevation,
  MenuItem,
  Switch,
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
import data from "../data/rewards-metrics.json";
import coinSymbolMapJSON from "../data/coins.json";
import axios from "axios";

/** ===========================================================================
 * Types & Config
 * ============================================================================
 */

interface Coin {
  id: string;
  name: string;
  symbol: string;
}

type CoinPriceMap = { [key: string]: number };
type CoinSymbolMap = { [key: string]: Coin };

const coinSymbolMap: CoinSymbolMap = coinSymbolMapJSON;

const PRICE_MAP_KEY = "PRICE_MAP_KEY";

const chartKeyMap = {
  total: {
    title: "Total Value",
    description: "Total USD value of all accounts in each coin",
  },
  interest_paid: {
    title: "Interest Paid",
    description: "Total interest paid in USD for all coins",
  },
  earning_in_cel: {
    title: "Earning in CEL",
    description: "Number of users earning in CEL for each coin",
  },
  number_of_users: {
    title: "Number of Users",
    description: "Number of users holding each coin",
  },
};

type ChartType = keyof typeof chartKeyMap;

const chartKeys = Object.keys(chartKeyMap) as ChartType[];

interface IState {
  loading: boolean;
  dialogOpen: boolean;
  viewTopCoins: boolean;
  chartType: ChartType;
  coinPriceMap: CoinPriceMap;
}

const ChartSelect = Select.ofType<ChartType>();

const loyaltyTierColors = {
  platinum: "rgb(161, 167, 195)",
  gold: "rgb(206, 165, 98)",
  silver: "rgb(214, 214, 214)",
  bronze: "rgb(254, 189, 149)",
  none: "rgb(50, 50, 50)",
};

/** ===========================================================================
 * React Component
 * ============================================================================
 */

class Main extends React.Component<{}, IState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      viewTopCoins: true,
      dialogOpen: false,
      coinPriceMap: {},
      chartType: "total",
      loading: true,
    };
  }

  async componentDidMount() {
    const cachedPriceMap = localStorage.getItem(PRICE_MAP_KEY);
    if (cachedPriceMap) {
      const priceMap = JSON.parse(cachedPriceMap);
      const { timestamp, coinPriceMap } = priceMap;
      const now = Date.now();
      const elapsed = now - timestamp;
      const sixHoursInMilliseconds = 1000 * 60 * 60 * 6;
      if (elapsed <= sixHoursInMilliseconds) {
        console.log("Using cached coin price map");
        this.setState({ loading: false, coinPriceMap });
        return;
      }
    }

    console.log("Price cache expired, fetching new prices...");
    const coins = Object.keys(data.portfolio);
    const prices = await Promise.all(
      coins.map(async (coin: string) => {
        try {
          // Not a valid symbol
          if (coin === "USDT ERC20") {
            return [coin, 1];
          } else if (coin === "MCDAI") {
            // I assume this is DAI?
            return [coin, 1];
          }

          const id = coinSymbolMap[coin].id;
          const response = await axios.get<any>(
            `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
          );
          const price = response.data[id].usd;
          return [coin, price];
        } catch (err) {
          console.log(`Failed to fetch prices for coin: ${coin}`);
          return null;
        }
      }),
    );

    const coinPriceMap = prices.filter(Boolean).reduce((map, result) => {
      // Null values are filtered above
      const [coin, price] = result as [number, number];
      return {
        ...map,
        [coin]: price,
      };
    }, {});

    this.setState({ loading: false, coinPriceMap }, () => {
      const { coinPriceMap } = this.state;
      localStorage.setItem(
        PRICE_MAP_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          coinPriceMap,
        }),
      );
    });
  }

  render() {
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
            <b>By the way:</b>
            <p>
              • If you know anyone at Celsius, I am interested in working for
              them. 🙂
            </p>
          </div>
        </Dialog>
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
              color="red"
              style={{ margin: 0, marginRight: 8, width: 180 }}
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
              onItemSelect={(item) => this.setState({ chartType: item })}
              itemRenderer={(item, { handleClick }) => (
                <MenuItem
                  text={chartKeyMap[item].title}
                  onClick={(e: any) => handleClick(e)}
                />
              )}
            >
              <Button
                rightIcon="double-caret-vertical"
                text={chartKeyMap[this.state.chartType].title}
              />
            </ChartSelect>
          </ChartControls>
        </ChartTitleRow>
        <ChartContainer>
          {this.state.loading ? (
            <span>Loading chart data...</span>
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
                <Bar dataKey="value" fill="rgb(215, 64, 176)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
        <SummaryRow>
          <div>
            <Card
              interactive={true}
              elevation={Elevation.TWO}
              style={{
                minHeight: 300,
                textAlign: "left",
                width: isMobile ? 300 : 500,
              }}
            >
              <CardTitle>Summary</CardTitle>
              <p>
                <b>Data Range:</b> June 18 - June 25, 2021
              </p>
              <p>
                <b>Total Users Earning:</b> {formatValue(data.stats.totalUsers)}
              </p>
              <p>
                <b>Total Interest Paid in USD:</b> $
                {formatValue(data.stats.totalInterestPaidInUsd)}
              </p>
              <p>
                <b>Average Number of Coins Per User:</b>{" "}
                {formatValue(data.stats.averageNumberOfCoinsPerUser)}
              </p>
              <p>
                <b>Maximum User Portfolio Size:</b>{" "}
                {formatValue(data.stats.maximumPortfolioSize)}
              </p>
              <p>
                The data here is compiled from the Celsius Proof of Community
                dataset.
              </p>
              <Button
                text="View More Info & Analysis"
                onClick={this.toggleDialog}
              />
            </Card>
          </div>
          <div style={{ marginTop: isMobile ? 24 : 0 }}>
            <Card
              interactive={true}
              elevation={Elevation.TWO}
              style={{
                minHeight: 300,
                textAlign: "left",
                width: isMobile ? 300 : 500,
              }}
            >
              <CardTitle>Celsius Loyalty Tiers</CardTitle>
              <PieChart width={isMobile ? 250 : 400} height={200}>
                <Legend
                  align="right"
                  layout="vertical"
                  verticalAlign="middle"
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
    const formattedValue = formatValue(value);

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

  getChartData = () => {
    const { chartType, coinPriceMap } = this.state;
    let chart = [];

    // Exclude TCAD... reference: https://www.coingecko.com/en/coins/truecad
    const portfolio = Object.entries(data.portfolio).filter(
      ([coin]) => coin !== "TCAD",
    );

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
}

/** ===========================================================================
 * Styles
 * ============================================================================
 */

const formatValue = (value: string) => {
  const options = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };

  return parseFloat(value).toLocaleString("en", options);
};

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
  margin-bottom: 8px;
`;

const ChartTitle = styled.p`
  margin: 0;
  font-weight: 600;
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

const ChartTitleRow = styled.div`
  padding-left: 80px;
  padding-right: 25px;
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
  padding-left: 80px;
  padding-right: 80px;
  margin-top: 25px;
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;

  @media ${MOBILE} {
    padding: 0px;
    flex-direction: column;
    justify-content: center;
  }
`;

/** ===========================================================================
 * Export
 * ============================================================================
 */

export default Main;
