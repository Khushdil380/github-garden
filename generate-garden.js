// generate-garden.js
require("dotenv").config();
const fs = require("fs");
const { request, gql } = require("graphql-request");

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.GITHUB_USERNAME;

const ENDPOINT = "https://api.github.com/graphql";
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
};

const MONTH_COLORS = [
  "#FF69B4", "#33CCFF", "#FFA07A", "#8F0A1A", "#ba7022", "#6495ED", "#DC143C", "#00BFFF", "#FFC080", "#4682B4", "#FF6347", "#7A288A"
];

const DARK_GREEN = "#87f408";

const query = gql`
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              color
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

async function fetchContributionData() {
  try {
    const data = await request({
      url: ENDPOINT,
      document: query,
      variables: { username: USERNAME },
      requestHeaders: HEADERS,
    });

    return data.user.contributionsCollection.contributionCalendar.weeks;
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    process.exit(1);
  }
}

function getMonthColor(dateStr) {
  const month = new Date(dateStr).getMonth();
  return MONTH_COLORS[month];
}

function getContributionHeight(count) {
  const boxSize = 14; // Make sure this matches your box size
  if (count >= 10) return boxSize;         // full fill
  if (count >= 8) return Math.round(boxSize * 4 / 5);  // 4/5
  if (count >= 5) return Math.round(boxSize * 3 / 5);  // 3/5
  if (count >= 3) return Math.round(boxSize * 2 / 5);  // 2/5
  if (count >= 1) return Math.round(boxSize * 1 / 5);  // 1/5
  return 0;
}

function formatDateLong(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function generateSVG(weeks) {
  const boxSize = 14;
  const boxMargin = 3;
  const xOffset = 40;
  const yOffset = 40;

  // Build a map from date to contribution count
  const dateMap = {};
  weeks.forEach(week => {
    week.contributionDays.forEach(day => {
      dateMap[day.date] = day.contributionCount;
    });
  });

  let elements = "";
  const year = new Date().getFullYear();

  let col = 0;
  let row = 0;

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const x = xOffset + col * (boxSize + boxMargin);
      const y = yOffset + row * (boxSize + boxMargin);

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dateMap[dateStr] || 0;
      const fillColor = MONTH_COLORS[month];

      const tooltip = `<title>${formatDateLong(dateStr)}: ${count} contribution${count !== 1 ? "s" : ""}</title>`;

      elements += `
        <g>
          ${tooltip}
          <rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" fill="${fillColor}" rx="2" ry="2"/>
          ${count > 0 ? `<rect x="${x}" y="${y + (boxSize - getContributionHeight(count))}" width="${boxSize}" height="${getContributionHeight(count)}" fill="${DARK_GREEN}" rx="2" ry="2"/>` : ""}
        </g>
      `;

      row++;
      if (row === 7) {
        row = 0;
        col++;
      }
    }
  }

  const width = xOffset * 2 + (col + 1) * (boxSize + boxMargin);
  const height = yOffset * 2 + 7 * (boxSize + boxMargin);

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    /* No background for transparency */
  </style>
  ${elements}
</svg>
`;

  return svg;
}

async function main() {
  console.log("Fetching contribution data...");
  const weeks = await fetchContributionData();
  console.log("Generating SVG...");
  const svg = generateSVG(weeks);
  fs.writeFileSync("garden.svg", svg);
  console.log("garden.svg updated successfully 🌱");
}

main();
