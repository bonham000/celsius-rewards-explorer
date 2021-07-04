import React from "react";
import { isMobile } from "react-device-detect";
import { Button, Card, Elevation, MenuItem, Switch } from "@blueprintjs/core";
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
// import axios from "axios";

/** ===========================================================================
 * Types & Config
 * ============================================================================
 */

interface Coin {
  id: string;
  name: string;
  symbol: string;
}

type CoinSymbolMap = Map<string, Coin>;

/**
 * CHART VIEWS:
 * - total earned (convert to USD)
 * - total earning in CEL
 * - total interest paid in USD
 * - number of users holding
 */
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
  viewTopCoins: boolean;
  chartType: ChartType;
  coinSymbolMap: CoinSymbolMap;
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
      chartType: "interest_paid",
      coinSymbolMap: new Map(),
    };
  }

  async componentDidMount() {
    // const coins = await axios.get(
    //   "https://api.coingecko.com/api/v3/coins/list",
    // );
    // const coinSymbolMap = coins.data.reduce(
    //   (map: CoinSymbolMap, coin: Coin) => {
    //     return {
    //       ...map,
    //       [coin.symbol]: coin,
    //     };
    //   },
    //   {},
    // );
    // this.setState({ coinSymbolMap });
  }

  render() {
    return (
      <Page>
        <PageTitle>Celsius Proof of Community Rewards Data</PageTitle>
        <ChartTitleRow>
          <ChartTitle>
            {chartKeyMap[this.state.chartType].description}
          </ChartTitle>
          <ChartControls>
            <Switch
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
              <Tooltip formatter={(value: string) => formatValue(value)} />
              <Bar dataKey="value" fill="rgb(215, 64, 176)" />
            </BarChart>
          </ResponsiveContainer>
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
              <h2 style={{ marginTop: 2, marginBottom: 8 }}>Summary Metrics</h2>
              <p>
                <b>Data Range:</b> June 18, 2021 - June 25, 2021
              </p>
              <p>
                <b>Total Users:</b> {data.stats.totalUsers}
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
              <h2>Celsius Loyalty Tiers</h2>
              <PieChart width={isMobile ? 250 : 400} height={200}>
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                />
                <Tooltip formatter={(value: string) => formatValue(value)} />
                <Pie
                  nameKey="tier"
                  dataKey="value"
                  innerRadius={isMobile ? 20 : 40}
                  outerRadius={isMobile ? 60 : 100}
                  data={this.getLoyaltyTiersData()}
                />
              </PieChart>
            </Card>
          </div>
        </SummaryRow>
      </Page>
    );
  }

  getChartData = () => {
    const { chartType } = this.state;
    let chart = [];

    const portfolio = Object.entries(data.portfolio);

    switch (chartType) {
      case "total": {
        for (const [coin, values] of portfolio) {
          chart.push({ coin, value: parseFloat(values.total) });
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

  @media ${MOBILE} {
    padding: 8px;
    padding-bottom: 50px;
  }
`;

const PageTitle = styled.h1`
  font-weight: 600;
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
