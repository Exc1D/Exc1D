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
  const width = 1200;
  const height = 900;

  // Header section with username and stats overview
  const headerSection = `
  <g>
    <rect x="20" y="20" width="1160" height="140" fill="var(--card)" stroke="var(--border)" stroke-width="1" rx="12" filter="drop-shadow(0 4px 6px var(--shadow))"/>
    <text x="40" y="55" class="title" style="font-size: 28px;">🎯 ${stats.username}'s GitHub Stats</text>
    <text x="40" y="80" class="stat-label">Last updated: ${new Date(
      stats.fetchedAt
    ).toLocaleDateString()}</text>
    
    <g transform="translate(40, 90)">
      <text class="stat-label" x="0" y="0">📊 Overview</text>
      <circle cx="80" cy="-5" r="4" fill="var(--primary)"/>
      <text class="badge-text" x="95" y="0">${stats.publicRepos} repos</text>
      <text class="badge-text" x="200" y="0">•</text>
      <text class="badge-text" x="215" y="0">${formatNumber(stats.totalCommits)} commits</text>
      <text class="badge-text" x="350" y="0">•</text>
      <text class="badge-text" x="365" y="0">${stats.followers} followers</text>
    </g>
  </g>`;

  // Quick stats cards in grid
  const quickStats = [
    { icon: "⭐", label: "Total Stars", value: formatNumber(stats.totalStars), x: 40 },
    { icon: "🔀", label: "Total Forks", value: formatNumber(stats.totalForks), x: 320 },
    { icon: "🔥", label: "Streak", value: `${stats.contributionStreak.current} days`, x: 600 },
    { icon: "📈", label: "Max Streak", value: `${stats.contributionStreak.max} days`, x: 880 },
  ];

  const quickStatsHTML = quickStats.map(stat => `
    <g transform="translate(${stat.x}, 180)">
      <rect class="card" width="260" height="80" rx="8"/>
      <text class="badge-icon" x="20" y="35">${stat.icon}</text>
      <text class="stat-label" x="20" y="62">${stat.label}</text>
      <text class="stat-value" x="240" y="40" text-anchor="end">${stat.value}</text>
    </g>
  `).join("");

  // Language chart
  const languageChartContent = stats.languages && stats.languages.length > 0
    ? createDonutChart(140, 420, 80, stats.languages, theme)
    : `<text class="stat-label" x="140" y="420">No language data available</text>`;

  const languageSection = `
  <g>
    <rect x="20" y="290" width="540" height="480" fill="var(--card)" stroke="var(--border)" stroke-width="1" rx="12" filter="drop-shadow(0 4px 6px var(--shadow))"/>
    <g transform="translate(40, 310)">
      <text class="title">💻 Top Languages</text>
    </g>
    ${languageChartContent}
  </g>`;

  // Contribution chart
  const streakChartContent = stats.contributionDays && stats.contributionDays.length > 0
    ? createStreakChart(620, 330, 540, 100, stats.contributionDays)
    : `<text class="stat-label" x="640" y="380">No contribution data available</text>`;

  const activitySection = `
  <g>
    <rect x="580" y="290" width="600" height="480" fill="var(--card)" stroke="var(--border)" stroke-width="1" rx="12" filter="drop-shadow(0 4px 6px var(--shadow))"/>
    <g transform="translate(600, 310)">
      <text class="title">📊 Activity & Stats</text>
    </g>
    <g transform="translate(600, 350)">
      <text class="stat-label" x="0" y="0">Last 30 Days Contributions</text>
    </g>
    ${streakChartContent}
    
    <g transform="translate(600, 530)">
      <text class="stat-label" x="0" y="0">Contributions</text>
      <text class="stat-value" x="0" y="25">${stats.totalCommits}</text>
      
      <text class="stat-label" x="150" y="0">Issues</text>
      <text class="stat-value" x="150" y="25">${stats.totalIssues}</text>
      
      <text class="stat-label" x="300" y="0">Pull Requests</text>
      <text class="stat-value" x="300" y="25">${stats.totalPRs}</text>
      
      <text class="stat-label" x="450" y="0">Following</text>
      <text class="stat-value" x="450" y="25">${stats.following}</text>
    </g>
  </g>`;

  // Summary stats footer
  const summaryStats = `
  <g>
    <rect x="20" y="790" width="1160" height="80" fill="var(--card)" stroke="var(--border)" stroke-width="1" rx="12" filter="drop-shadow(0 4px 6px var(--shadow))"/>
    <g transform="translate(40, 810)">
      <text class="title" style="font-size: 14px;">📈 Summary</text>
      <text class="badge-text" x="0" y="30">Total Repositories: ${stats.publicRepos}</text>
      <text class="badge-text" x="300" y="30">Public Stars: ${formatNumber(stats.totalStars)}</text>
      <text class="badge-text" x="600" y="30">Total Forks: ${formatNumber(stats.totalForks)}</text>
      <text class="badge-text" x="900" y="30">Current Streak: ${stats.contributionStreak.current} days</text>
    </g>
  </g>`;

  const content = `
    ${headerSection}
    ${quickStatsHTML}
    ${languageSection}
    ${activitySection}
    ${summaryStats}
  `;

  return createSVGTemplate(width, height, content, themes);
}
