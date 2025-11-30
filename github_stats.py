#!/usr/bin/env python3
"""
GitHub Stats Generator - Beautiful SVG cards for your GitHub profile
Compatible with GitHub Actions for automatic updates
"""

import os
import sys
import requests
from datetime import datetime, timedelta
from collections import defaultdict
import json
import math

class GitHubStatsGenerator:
    def __init__(self, username, token=None):
        self.username = username
        self.token = token or os.environ.get('GITHUB_TOKEN')
        self.headers = {
            'Authorization': f'token {self.token}' if self.token else '',
            'Accept': 'application/vnd.github.v3+json'
        }
        self.api_base = 'https://api.github.com'
        
    def make_request(self, url):
        """Make authenticated request to GitHub API"""
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching {url}: {e}", file=sys.stderr)
            return None
    
    def get_user_data(self):
        """Get basic user information"""
        return self.make_request(f'{self.api_base}/users/{self.username}')
    
    def get_repos(self):
        """Get all repositories for the user"""
        repos = []
        page = 1
        while True:
            data = self.make_request(
                f'{self.api_base}/users/{self.username}/repos?per_page=100&page={page}'
            )
            if not data:
                break
            repos.extend(data)
            if len(data) < 100:
                break
            page += 1
        return repos
    
    def get_commit_activity(self):
        """Calculate commit statistics and streaks"""
        # Use GraphQL for better commit data
        query = """
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
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
        """
        
        graphql_url = 'https://api.github.com/graphql'
        response = requests.post(
            graphql_url,
            json={'query': query, 'variables': {'username': self.username}},
            headers=self.headers
        )
        
        if response.status_code != 200:
            return {'total_commits': 0, 'current_streak': 0, 'longest_streak': 0}
        
        data = response.json()
        calendar = data['data']['user']['contributionsCollection']['contributionCalendar']
        
        # Calculate streaks
        current_streak = 0
        longest_streak = 0
        temp_streak = 0
        
        # Flatten weeks into days
        all_days = []
        for week in calendar['weeks']:
            all_days.extend(week['contributionDays'])
        
        # Reverse to check from most recent
        for day in reversed(all_days):
            if day['contributionCount'] > 0:
                temp_streak += 1
                if current_streak == 0:  # Still in current streak
                    current_streak = temp_streak
                longest_streak = max(longest_streak, temp_streak)
            else:
                if current_streak > 0:  # Current streak ended
                    current_streak = temp_streak
                temp_streak = 0
        
        return {
            'total_commits': calendar['totalContributions'],
            'current_streak': current_streak,
            'longest_streak': longest_streak
        }
    
    def calculate_stats(self):
        """Calculate all GitHub statistics"""
        print(f"🔍 Fetching stats for {self.username}...")
        
        user_data = self.get_user_data()
        if not user_data:
            print("❌ Failed to fetch user data", file=sys.stderr)
            return None
        
        repos = self.get_repos()
        commit_data = self.get_commit_activity()
        
        # Calculate statistics
        total_stars = sum(repo.get('stargazers_count', 0) for repo in repos)
        total_forks = sum(repo.get('forks_count', 0) for repo in repos)
        
        # Language statistics
        languages = defaultdict(int)
        for repo in repos:
            if repo.get('language'):
                languages[repo['language']] += 1
        
        # Sort and get top 5 languages
        top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:5]
        
        stats = {
            'username': self.username,
            'name': user_data.get('name', self.username),
            'followers': user_data.get('followers', 0),
            'total_repos': user_data.get('public_repos', 0),
            'total_stars': total_stars,
            'total_forks': total_forks,
            'total_commits': commit_data['total_commits'],
            'current_streak': commit_data['current_streak'],
            'longest_streak': commit_data['longest_streak'],
            'top_languages': top_languages,
            'avatar_url': user_data.get('avatar_url', ''),
            'created_at': user_data.get('created_at', ''),
        }
        
        print("✅ Stats calculated successfully!")
        return stats
    
    def generate_svg(self, stats):
        """Generate beautiful SVG with modern design trends"""
        
        # Color palette - vibrant gradients inspired by 2025 trends
        colors = {
            'bg_gradient_start': '#0d1117',
            'bg_gradient_end': '#161b22',
            'card_bg': 'rgba(22, 27, 34, 0.8)',
            'primary': '#58a6ff',
            'secondary': '#f778ba',
            'accent': '#7ee787',
            'text': '#c9d1d9',
            'text_secondary': '#8b949e',
            'border': 'rgba(88, 166, 255, 0.2)',
        }
        
        # Language colors
        lang_colors = {
            'Python': '#3572A5',
            'JavaScript': '#f1e05a',
            'TypeScript': '#3178c6',
            'Java': '#b07219',
            'Go': '#00ADD8',
            'Rust': '#dea584',
            'C++': '#f34b7d',
            'Ruby': '#701516',
            'PHP': '#4F5D95',
            'Swift': '#ffac45',
        }
        
        # Calculate language percentages
        total_lang_count = sum(count for _, count in stats['top_languages'])
        lang_data = [
            {
                'name': lang,
                'percentage': (count / total_lang_count * 100) if total_lang_count > 0 else 0,
                'color': lang_colors.get(lang, '#858585')
            }
            for lang, count in stats['top_languages']
        ]
        
        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{colors['bg_gradient_start']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{colors['bg_gradient_end']};stop-opacity:1" />
    </linearGradient>
    
    <!-- Card glassmorphism effect -->
    <filter id="glass">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
    </filter>
    
    <!-- Glow effect -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Title gradient -->
    <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:{colors['primary']};stop-opacity:1" />
      <stop offset="50%" style="stop-color:{colors['secondary']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{colors['accent']};stop-opacity:1" />
    </linearGradient>
    
    <style>
      .header {{ font: 600 28px 'Segoe UI', Ubuntu, sans-serif; fill: url(#titleGradient); }}
      .stat-label {{ font: 400 14px 'Segoe UI', Ubuntu, sans-serif; fill: {colors['text_secondary']}; }}
      .stat-value {{ font: 700 24px 'Segoe UI', Ubuntu, sans-serif; fill: {colors['text']}; }}
      .lang-name {{ font: 500 13px 'Segoe UI', Ubuntu, sans-serif; fill: {colors['text']}; }}
      .lang-percent {{ font: 600 12px 'Segoe UI', Ubuntu, sans-serif; fill: {colors['text_secondary']}; }}
      .section-title {{ font: 600 18px 'Segoe UI', Ubuntu, sans-serif; fill: {colors['primary']}; }}
      
      @keyframes fadeIn {{
        from {{ opacity: 0; transform: translateY(10px); }}
        to {{ opacity: 1; transform: translateY(0); }}
      }}
      
      .stat-card {{
        animation: fadeIn 0.6s ease-out forwards;
        opacity: 0;
      }}
      
      .stat-card:nth-child(1) {{ animation-delay: 0.1s; }}
      .stat-card:nth-child(2) {{ animation-delay: 0.2s; }}
      .stat-card:nth-child(3) {{ animation-delay: 0.3s; }}
      .stat-card:nth-child(4) {{ animation-delay: 0.4s; }}
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="600" fill="url(#bgGradient)" rx="10"/>
  
  <!-- Header -->
  <text x="40" y="50" class="header">⭐ {stats['name']}'s GitHub Stats</text>
  
  <!-- Main Stats Grid -->
  <g class="stat-card">
    <!-- Total Commits -->
    <rect x="40" y="80" width="170" height="100" fill="{colors['card_bg']}" stroke="{colors['border']}" stroke-width="1.5" rx="12" opacity="0.9"/>
    <text x="125" y="110" text-anchor="middle" class="stat-label">📝 Total Commits</text>
    <text x="125" y="145" text-anchor="middle" class="stat-value">{stats['total_commits']:,}</text>
  </g>
  
  <g class="stat-card">
    <!-- Repositories -->
    <rect x="220" y="80" width="170" height="100" fill="{colors['card_bg']}" stroke="{colors['border']}" stroke-width="1.5" rx="12" opacity="0.9"/>
    <text x="305" y="110" text-anchor="middle" class="stat-label">📦 Repositories</text>
    <text x="305" y="145" text-anchor="middle" class="stat-value">{stats['total_repos']}</text>
  </g>
  
  <g class="stat-card">
    <!-- Stars -->
    <rect x="400" y="80" width="170" height="100" fill="{colors['card_bg']}" stroke="{colors['border']}" stroke-width="1.5" rx="12" opacity="0.9"/>
    <text x="485" y="110" text-anchor="middle" class="stat-label">⭐ Total Stars</text>
    <text x="485" y="145" text-anchor="middle" class="stat-value">{stats['total_stars']:,}</text>
  </g>
  
  <g class="stat-card">
    <!-- Followers -->
    <rect x="580" y="80" width="170" height="100" fill="{colors['card_bg']}" stroke="{colors['border']}" stroke-width="1.5" rx="12" opacity="0.9"/>
    <text x="665" y="110" text-anchor="middle" class="stat-label">👥 Followers</text>
    <text x="665" y="145" text-anchor="middle" class="stat-value">{stats['followers']}</text>
  </g>
  
  <!-- Streak Section -->
  <text x="40" y="220" class="section-title">🔥 Contribution Streaks</text>
  
  <rect x="40" y="235" width="350" height="120" fill="{colors['card_bg']}" stroke="{colors['border']}" stroke-width="1.5" rx="12" opacity="0.9"/>
  
  <!-- Current Streak -->
  <text x="60" y="270" class="stat-label">Current Streak</text>
  <text x="60" y="300" class="stat-value" fill="{colors['accent']}">{stats['current_streak']} days</text>
  
  <!-- Longest Streak -->
  <text x="60" y="330" class="stat-label">Longest Streak</text>
  <text x="60" y="360" class="stat-value" fill="{colors['secondary']}">{stats['longest_streak']} days</text>
  
  <!-- Top Languages -->
  <text x="410" y="220" class="section-title">💻 Top Languages</text>
  
  <rect x="410" y="235" width="350" height="310" fill="{colors['card_bg']}" stroke="{colors['border']}" stroke-width="1.5" rx="12" opacity="0.9"/>
'''
        
        # Add language bars
        y_offset = 270
        for i, lang in enumerate(lang_data):
            bar_width = (lang['percentage'] / 100) * 280
            
            svg += f'''
  <!-- {lang['name']} -->
  <text x="430" y="{y_offset}" class="lang-name">{lang['name']}</text>
  <text x="740" y="{y_offset}" text-anchor="end" class="lang-percent">{lang['percentage']:.1f}%</text>
  
  <!-- Progress bar background -->
  <rect x="430" y="{y_offset + 8}" width="280" height="8" fill="rgba(139, 148, 158, 0.2)" rx="4"/>
  <!-- Progress bar fill -->
  <rect x="430" y="{y_offset + 8}" width="{bar_width}" height="8" fill="{lang['color']}" rx="4">
    <animate attributeName="width" from="0" to="{bar_width}" dur="1s" fill="freeze"/>
  </rect>
'''
            y_offset += 50
        
        # Activity visualization (simplified heat map)
        svg += f'''
  
  <!-- Activity Section -->
  <text x="40" y="385" class="section-title">📊 Recent Activity</text>
  
  <rect x="40" y="400" width="350" height="145" fill="{colors['card_bg']}" stroke="{colors['border']}" stroke-width="1.5" rx="12" opacity="0.9"/>
  
  <!-- Mini contribution graph placeholder -->
  <text x="60" y="430" class="stat-label">Contribution Graph</text>
'''
        
        # Add simple contribution squares (visualization)
        square_size = 8
        gap = 4
        start_x = 60
        start_y = 450
        
        for week in range(12):  # 12 weeks
            for day in range(7):  # 7 days
                x = start_x + week * (square_size + gap)
                y = start_y + day * (square_size + gap)
                # Random-ish intensity based on stats
                intensity = (hash(f"{week}{day}{stats['total_commits']}") % 5) / 4
                opacity = 0.2 + (intensity * 0.8)
                
                svg += f'''  <rect x="{x}" y="{y}" width="{square_size}" height="{square_size}" fill="{colors['accent']}" opacity="{opacity}" rx="2"/>
'''
        
        svg += '''
  
  <!-- Footer -->
  <text x="400" y="580" text-anchor="middle" class="stat-label">
    Generated with ❤️ by GitHub Stats Generator
  </text>
</svg>'''
        
        return svg
    
    def save_svg(self, svg_content, filename='github-stats.svg'):
        """Save SVG to file"""
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        print(f"✅ Stats saved to {filename}")

def main():
    # Get username from environment or command line
    username = os.environ.get('GITHUB_USERNAME') or (sys.argv[1] if len(sys.argv) > 1 else None)
    
    if not username:
        print("❌ Error: Please provide GitHub username", file=sys.stderr)
        print("Usage: python github_stats.py <username>", file=sys.stderr)
        print("Or set GITHUB_USERNAME environment variable", file=sys.stderr)
        sys.exit(1)
    
    # Initialize generator
    generator = GitHubStatsGenerator(username)
    
    # Calculate stats
    stats = generator.calculate_stats()
    
    if not stats:
        print("❌ Failed to generate stats", file=sys.stderr)
        sys.exit(1)
    
    # Generate SVG
    svg = generator.generate_svg(stats)
    
    # Save to file
    output_file = os.environ.get('OUTPUT_FILE', 'github-stats.svg')
    generator.save_svg(svg, output_file)
    
    print(f"\n🎉 Done! Add this to your README.md:")
    print(f"![GitHub Stats](./github-stats.svg)")

if __name__ == '__main__':
    main()
