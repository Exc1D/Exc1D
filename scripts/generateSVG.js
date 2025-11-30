import { themes, getTheme } from "./helpers/colors.js";
import {
  createSVGTemplate,
  createBadge,
  createStatCard,
} from "./helpers/templates.js";
import { createDonutChart, createStreakChart } from "./helpers/charts.js";
import { formatNumber } from "./helpers/utils.js";

export function generateSVG(stats, themeType = "dark") {
  const theme = getTheme(themeType);
  const width = 1000;
  const height = 800;

  const badges = [
    { icon: "👥", label: "Followers", value: formatNumber(stats.followers) },
    { icon: "⭐", label: "Total Stars", value: formatNumber(stats.totalStars) },
    { icon: "🔀", label: "Total Forks", value: formatNumber(stats.totalForks) },
    {
      icon: "📦",
      label: "Repositories",
      value: formatNumber(stats.publicRepos),
    },
    {
      icon: "🔥",
      label: "Streak",
      value: `${stats.contributionStreak.current} days`,
    },
    { icon: "💻", label: "Commits", value: formatNumber(stats.totalCommits) },
  ];

  // Create badges in 2 rows of 3
  let badgeX = 30;
  let badgeY = 30;
  const badgeHTML = badges
    .map((badge, i) => {
      const x = badgeX + (i % 3) * 310;
      const y = badgeY + Math.floor(i / 3) * 100;
      return createBadge(x, y, badge.icon, badge.label, badge.value);
    })
    .join("");

  const languageChart =
    stats.languages && stats.languages.length > 0
      ? createDonutChart(80, 420, 70, stats.languages, theme)
      : `<text class="stat-label" x="80" y="420">No language data available</text>`;

  const streakChart =
    stats.contributionDays && stats.contributionDays.length > 0
      ? createStreakChart(400, 280, 560, 80, stats.contributionDays)
      : `<text class="stat-label" x="400" y="300">No contribution data available</text>`;

  const additionalStats = createStatCard(
    30,
    520,
    940,
    250,
    "📊 Additional Stats",
    [
      { label: "Issues Created", value: formatNumber(stats.totalIssues) },
      { label: "Pull Requests", value: formatNumber(stats.totalPRs) },
      { label: "Max Streak", value: `${stats.contributionStreak.max} days` },
      { label: "Following", value: formatNumber(stats.following) },
    ]
  );

  const titleSection = `
  <g transform="translate(30, 240)">
    <text class="title" x="0" y="0">🎯 ${stats.username}'s GitHub Stats</text>
    <text class="stat-label" x="0" y="25">Last updated: ${new Date(
      stats.fetchedAt
    ).toLocaleDateString()}</text>
  </g>`;

  const languageTitle =
    stats.languages && stats.languages.length > 0
      ? `
  <g transform="translate(30, 290)">
    <text class="title" x="0" y="0">💻 Top Languages</text>
  </g>`
      : "";

  const content = `
    ${badgeHTML}
    ${titleSection}
    <g transform="translate(400, 250)">
      <text class="stat-label" x="0" y="0">Last 30 Days Activity</text>
    </g>
    ${streakChart}
    ${languageTitle}
    ${languageChart}
    ${additionalStats}
  `;

  return createSVGTemplate(width, height, content, themes);
}
