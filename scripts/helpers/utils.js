import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

export async function saveFile(filepath, content) {
  try {
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, content, "utf-8");
    console.log(`✓ Saved: ${filepath}`);
  } catch (error) {
    console.error(`✗ Failed to save ${filepath}:`, error.message);
    throw error;
  }
}

export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function validateEnvironment() {
  const required = ["GITHUB_USERNAME", "GITHUB_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const username = process.env.GITHUB_USERNAME.trim();
  const token = process.env.GITHUB_TOKEN.trim();

  // Validate username format
  if (!/^[a-zA-Z0-9-]+$/.test(username)) {
    throw new Error(
      `Invalid GITHUB_USERNAME format: "${username}". Only alphanumeric characters and hyphens are allowed.`
    );
  }

  // Validate token format (basic check)
  if (token.length < 20) {
    throw new Error(
      `GITHUB_TOKEN appears to be invalid (too short). Please check your token.`
    );
  }

  return { username, token };
}

export function calculatePercentageChange(current, previous) {
  if (previous === 0) return 0;
  return (((current - previous) / previous) * 100).toFixed(1);
}

export function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

async function fetchRepositoryStats(username, headers) {
  let page = 1;
  let allRepos = [];
  let hasMore = true;

  while (hasMore && page <= 10) {
    // Limit to 1000 repos (10 pages)
    const response = await fetchWithRetry(
      `${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}`,
      { headers }
    );

    const repos = await response.json();

    if (repos.length === 0) {
      hasMore = false;
    } else {
      allRepos = allRepos.concat(repos);
      page++;
    }
  }

  const totalStars = allRepos.reduce(
    (sum, repo) => sum + (repo.stargazers_count || 0),
    0
  );
  const totalForks = allRepos.reduce(
    (sum, repo) => sum + (repo.forks_count || 0),
    0
  );

  return { totalStars, totalForks, repoCount: allRepos.length };
}
