import { fetchGitHubStats } from "./fetchStats.js";
import { generateSVG } from "./generateSVG.js";
import { saveFile, validateEnvironment } from "./helpers/utils.js";
import { logger } from "./helpers/logger.js";
import { join, basename } from "path";

async function main() {
  try {
    logger.info("Starting GitHub Stats Generator...\n");

    const { username, token } = validateEnvironment();
    logger.info(`Fetching stats for: ${username}\n`);

    const stats = await fetchGitHubStats(username, token);
    logger.info("Stats fetched successfully\n");

    logger.info("Generating SVG...");
    const svgContent = generateSVG(stats, "dark");

    const assetsDir = join(process.cwd(), "assets");
    const svgPath = join(assetsDir, "github-stats.svg");

    await saveFile(svgPath, svgContent);

    const repoName = process.env.GITHUB_REPOSITORY
      ? process.env.GITHUB_REPOSITORY.split("/")[1]
      : basename(process.cwd());

    logger.info("\n✨ Generation complete!");
    logger.info(`\n📍 Output location: ${svgPath}`);
    logger.info("\n📋 Embed in your README with:");
    logger.info(`
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${username}/${repoName}/main/assets/github-stats.svg?theme=dark">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${username}/${repoName}/main/assets/github-stats.svg?theme=light">
  <img alt="GitHub Stats" src="https://raw.githubusercontent.com/${username}/${repoName}/main/assets/github-stats.png" />
</picture>
    `);
  } catch (error) {
    logger.error("Error:", error.message);
    process.exit(1);
  }
}

main();
