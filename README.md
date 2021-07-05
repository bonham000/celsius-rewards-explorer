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
2. Open the `parse-csv.ts` file and check the `DATE_IDENTIFIER` value. If the CSV you have is for the most recent dataset, use this identifier. Otherwise, increment the identifier appropriately.
3. Name the file following the format `{DATE_IDENTIFIER}-rewards.csv`, e.g. `02-rewards.csv`.
4. Move the file to the `csv/original-csv-data/` directory.
5. Run the `csv` command, e.g.`yarn csv`. This will read the CSV you entered and then save the data as JSON.
6. Now you can run the app with `yarn start` to visualize the new data.

### How does the identifier work?

The `DATE_IDENTIFIER` is used to identify which rewards dataset is being used currently. Each rewards dataset maps to a specific weekly rewards date range. See the `rewardsDataMap` in `Main.tsx` for details. Basically, to add a new dataset in a future week you would following the following steps:

1. Download the new CSV file and move it to `csv/original-csv-data/`.
2. Increment the `DATE_IDENTIFIER`, e.g. for the next week after June 18 - 25, the `DATE_IDENTIFIER` would become `02`.
3. Run `yarn csv`.
4. Add the new date range to `DateRangesType` and `dateRanges` in `Main.tsx`.
5. Add the dataset to the `rewardsDataMap` map in `Main.tsx`.

That's it, the app should then allow users to select that week's date range.

### Debugging

The CSV file is huge (over 1GB) and cumbersome to work with. To help with this, there is a `debug` flag in the `parse-csv` file which, if switched on, will only process a few rows of the CSV and also dump out custom data to the `debug.json` file. To run the CSV parser in debug mode run `yarn csv:debug`.
