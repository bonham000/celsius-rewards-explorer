import fs from "fs";
import readline from "readline";

const filename = "csv/rewards.csv";

const lineReaderInterface = readline.createInterface({
  input: require("fs").createReadStream(filename),
});

const writeJSON = (data: any) => {
  console.log("- Done! Writing result to file.");
  const jsonString = JSON.stringify(data, null, 2);
  fs.writeFileSync("./csv/rewards.json", jsonString, "utf-8");
};

const readCSV = () => {
  let count = 0;
  const result = {};

  console.log("- Processing CSV file...");

  lineReaderInterface.on("line", (line) => {
    count++;

    const text = line;
    let index = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ",") {
        index = i;
        break;
      }
    }

    const uuid = text.slice(0, index);

    // Ignore header row
    if (uuid !== "id") {
      const json = text.slice(index + 1);
      const data = JSON.parse(json);
      result[uuid] = data;
    }

    if (count === 5) {
      lineReaderInterface.close();
    }
  });

  lineReaderInterface.on("close", () => {
    writeJSON(result);
  });
};

readCSV();
