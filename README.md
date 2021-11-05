# Deprecated

This repo is not updated anymore. You can clone it and add new CSV datasets if you wish.

# Celsius Network Proof of Community Rewards Explorer

This is a UI for visualizing the weekly [Celsius Network](https://celsius.network/) Proof of Community rewards datasets.

<img width="1440" alt="Celsius Proof of Community" src="https://user-images.githubusercontent.com/18126719/124401978-a1232a00-dd5f-11eb-91e2-4143dd394f83.png">

# Project Structure

There are two relevant folders, `csv/` which contains the code for processing the CSV files and `src/` which contains the frontend React application which visualizes the data.

```
.
├── csv                       - CSV transformation scripts
│   ├── debug                 # debug output folder
│   ├── original-csv-data     # location for original CSV files
│   └── src                   # code for processing the CSV files
├── src                       - Client React App
│   ├── app                   # Client codebase
│   └── data                  # JSON rewards data, and some other data
```

# Getting Started

It's recommended to have [Node](https://nodejs.org/en/), [npm](https://www.npmjs.com/), and [yarn](https://yarnpkg.com/lang/en/docs/) installed.

```
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
2. Name the file following the format `{identifier}-rewards.csv`, e.g. `02-rewards.csv`.
3. Move the file to the `csv/original-csv-data/` directory.
4. Run the `csv` command, e.g.`yarn csv`. This will read the CSV you entered and then save the data as JSON.
5. Now you can run the app with `yarn start` to visualize the new data.

### How does the identifier work?

The `CSV_KEYS` is used to identify which rewards dataset is being used currently. Each rewards dataset maps to a specific weekly rewards date range. See the `rewardsDataMap` in `App.tsx` for details. Basically, to add a new dataset in a future week you would following the following steps:

1. Download the new CSV file and move it to `csv/original-csv-data/`.
2. Run `yarn csv` to process the new file.
3. Update the `rewards.ts` file to import the JSON data and define the latest week's date range. See that file for details.
4. You may need to add additional coin data, if the new week's dataset includes new coins. Find the appropriate coin id for the CoinGecko API (https://api.coingecko.com/api/v3/coins/list) and add it to the `coins.json` file.

That's it, the app should then allow users to select that week's date range.

### Updating the CSV Transformation Logic

If you make an update to the logic which transforms the CSV data, all of the CSV files may need to be re-processed. You can do this using the `yarn csv:all` command, which will iterate backwards through the `CSV_KEYS` array and process each CSV file until the array is empty.

### Debugging the CSV Files

The CSV file is huge (over 1GB) and cumbersome to work with. To help with this, there is a `debug` flag in the `main` file which, if switched on, will only process a few rows of the CSV and also dump out custom data to the `csv/debug` directory. To run the CSV transformation in debug mode run `yarn csv:debug`.

# Contributing

Feel free to make pull requests to this repo. Pull requests can be merged after a review and passing status checks. Any commits to the `main` branch will re-deploy the site.
