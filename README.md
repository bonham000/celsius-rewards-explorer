# Celsius Network Proof of Community Rewards Explorer

This is a UI for visualizing the weekly [Celsius Network](https://celsius.network/) Proof of Community rewards datasets.

<img width="1440" alt="Celsius Proof of Community" src="https://user-images.githubusercontent.com/18126719/124401978-a1232a00-dd5f-11eb-91e2-4143dd394f83.png">

# Getting Started

It's recommended to have [Node](https://nodejs.org/en/), [npm](https://www.npmjs.com/), and [yarn](https://yarnpkg.com/lang/en/docs/) installed. You can use [nvm](https://github.com/nvm-sh/nvm) to manage different versions of Node.

```shell
# Install dependencies
$ yarn

# Run the application
$ yarn start

# Run the tests
$ yarn test

# Build the application
$ yarn build
```

# Working with the CSV Data

This application uses the CSV files provided by the Celsius Proof of Community feature. These CSV files are very large (over 1GB) and exist in the `csv/original-csv-data/` folder, which is ignored from version control because the files are so large. To work with the raw data locally following the follow steps:

1. Download a CSV file from the Celsius Proof of Community Feature.
2. Open the `parse-csv.ts` file and check the `CSV_KEYS` list. If the CSV you have is new, add another value in this list, e.g. after `01` would be `02`. This value corresponds to the file name for that CSV.
3. Name the file following the format `{identifier}-rewards.csv`, e.g. `02-rewards.csv`.
4. Move the file to the `csv/original-csv-data/` directory.
5. Run the `csv` command, e.g.`yarn csv`. This will read the CSV you entered and then save the data as JSON.
6. Now you can run the app with `yarn start` to visualize the new data.

### How does the identifier work?

The `CSV_KEYS` is used to identify which rewards dataset is being used currently. Each rewards dataset maps to a specific weekly rewards date range. See the `rewardsDataMap` in `Main.tsx` for details. Basically, to add a new dataset in a future week you would following the following steps:

1. Download the new CSV file and move it to `csv/original-csv-data/`.
2. Add a new value in the `CSV_KEYS` list, e.g. for the next week after June 18 - 25, you would add `02` to the list.
3. Run `yarn csv`.
4. Add the new date range to `DateRangesType` and `dateRanges` in `Main.tsx`.
5. Add the dataset to the `rewardsDataMap` map in `Main.tsx`.
6. You may need to add additional coin data, if the new week's dataset includes new coins. Find the appropriate coin id for the CoinGecko API (https://api.coingecko.com/api/v3/coins/list) and add it to the `coins.json` file.

That's it, the app should then allow users to select that week's date range.

### Updating the CSV Transformation Logic

If you make an update to the logic which transforms the CSV data, all of the CSV files may need to be re-processed. You can do this using the `yarn csv:all` command, which will iterate backwards through the `CSV_KEYS` array and process each CSV file until the array is empty.

### Debugging

The CSV file is huge (over 1GB) and cumbersome to work with. To help with this, there is a `debug` flag in the `parse-csv` file which, if switched on, will only process a few rows of the CSV and also dump out custom data to the `csv/debug` directory. To run the CSV transformation in debug mode run `yarn csv:debug`.

# Contributing

Feel free to make pull requests to this repo. Pull requests can be merged after a review and passing status checks. Any commits to the `main` branch will re-deploy the site.
