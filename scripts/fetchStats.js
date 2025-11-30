import fetch from "node-fetch";

const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export async function fetchGitHubStats(username, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "GitHub-Stats-Generator",
  };

  try {
    const [userStats, repoStats, contributionStats, languageStats] =
      await Promise.all([
        fetchUserData(username, headers),
        fetchRepositoryStats(username, headers),
        fetchContributionData(username, headers),
        fetchLanguageData(username, headers),
      ]);

    return {
      username,
      followers: userStats.followers || 0,
      following: userStats.following || 0,
      publicRepos: userStats.public_repos || 0,
      totalStars: repoStats.totalStars || 0,
      totalForks: repoStats.totalForks || 0,
      totalIssues: contributionStats.totalIssues || 0,
      totalPRs: contributionStats.totalPRs || 0,
      totalCommits: contributionStats.totalCommits || 0,
      contributionStreak: contributionStats.streak || { current: 0, max: 0 },
      contributionDays: contributionStats.contributionDays || [],
      languages: languageStats || [],
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching GitHub stats:", error.message);
    if (error.message.includes("rate limit")) {
      console.error(
        "⚠️  GitHub API rate limit exceeded. Please try again later."
      );
    }
    throw error;
  }
}

async function fetchUserData(username, headers) {
  const response = await fetch(`${GITHUB_API}/users/${username}`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`);
  }
  return await response.json();
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

  return { totalStars, totalForks };
}

async function fetchContributionData(username, headers) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetchWithRetry(GITHUB_GRAPHQL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables: { username },
    }),
  });

  const data = await response.json();

  // Check for GraphQL errors
  if (data.errors) {
    throw new Error(`GraphQL Error: ${data.errors[0].message}`);
  }

  if (!data.data || !data.data.user) {
    throw new Error(`User "${username}" not found`);
  }

  const contributions = data.data.user.contributionsCollection;
  const calendar = contributions.contributionCalendar;

  const allDays = calendar.weeks.flatMap((week) => week.contributionDays);
  const streak = calculateStreak(allDays);

  return {
    totalCommits: contributions.totalCommitContributions,
    totalIssues: contributions.totalIssueContributions,
    totalPRs:
      contributions.totalPullRequestContributions +
      contributions.totalPullRequestReviewContributions,
    streak,
    contributionDays: allDays,
  };
}

async function fetchLanguageData(username, headers) {
  const response = await fetchWithRetry(
    `${GITHUB_API}/users/${username}/repos?per_page=100`,
    { headers }
  );

  const repos = await response.json();
  const languageCounts = {};

  for (const repo of repos) {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  }

  const sortedLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  if (sortedLanguages.length === 0) {
    return [];
  }

  const total = sortedLanguages.reduce((sum, lang) => sum + lang.count, 0);

  return sortedLanguages.map((lang) => ({
    name: lang.name,
    percentage: total > 0 ? ((lang.count / total) * 100).toFixed(1) : "0.0",
  }));
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 403) {
        const rateLimitReset = response.headers.get("x-ratelimit-reset");
        if (rateLimitReset) {
          const resetTime = new Date(parseInt(rateLimitReset) * 1000);
          throw new Error(
            `Rate limit exceeded. Resets at ${resetTime.toLocaleString()}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;

      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      console.log(`Retry ${i + 1}/${retries} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Update fetchUserData to use retry logic:
async function fetchUserData(username, headers) {
  const response = await fetchWithRetry(`${GITHUB_API}/users/${username}`, {
    headers,
  });
  return await response.json();
}

function calculateStreak(contributionDays) {
  if (!contributionDays.length) return { current: 0, max: 0 };

  // Sort in ascending order (oldest to newest)
  const sortedDays = [...contributionDays].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find current streak (working backwards from today)
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const dayDate = new Date(sortedDays[i].date);
    dayDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - dayDate) / (1000 * 60 * 60 * 24));

    if (sortedDays[i].contributionCount > 0) {
      if (daysDiff <= currentStreak + 1) {
        currentStreak++;
      } else {
        break;
      }
    } else if (daysDiff <= 1) {
      // Allow grace period for today/yesterday
      continue;
    } else {
      break;
    }
  }

  // Calculate max streak
  for (let i = 0; i < sortedDays.length; i++) {
    if (sortedDays[i].contributionCount > 0) {
      tempStreak++;
      maxStreak = Math.max(maxStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return {
    current: currentStreak,
    max: maxStreak,
  };
}
