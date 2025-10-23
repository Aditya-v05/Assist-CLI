#!/usr/bin/env node

const { program } = require('commander');
const { execSync } = require('child_process');
const clipboardy = require('clipboardy'); 
const { db, initDb } = require('./database');
const axios = require('axios'); 

// Define the version and description of your tool
program
  .version('1.0.0')
  .description('A personal CLI assistant for your day-to-day coding life.');

initDb();
// Define your first, simple command
program
  .command('hello')
  .description('Say hello to Assist')
  .action(() => {
    console.log('Hello, Assit! I am ready to help.');
  });

// This line is essential. It parses the arguments you pass in
// (like 'hello') and runs the correct .action()
// ... all your other code ...

program
  .command('go <project-name>')
  .description('Open a project directory in VS Code')
  .action((projectName) => {
    // --- !!! CHANGE THIS LINE !!! ---
    // Tell the assistant where your projects live.
    const devPath = 'C:/Users/adity'; // e.g., 'C:/Users/YourName/projects' on Windows
    // --- !!! -------------------- !!!

    const projectPath = `${devPath}/${projectName}`;

    console.log(`Opening ${projectPath} in VS Code...`);

    try {
      // This runs the shell command 'code /path/to/your/project'
      execSync(`code ${projectPath}`);
    } catch (error) {
      console.error(`Could not find project at: ${projectPath}`);
      console.error('Make sure VS Code "code" command is in your PATH.');
    }
  });

  // ... (your 'go' command is above this) ...

program
  .command('git-clean')
  .description('Fetch updates and clean up local branches already merged into remote main/master')
  .action(() => {
    console.log('🧹 Starting the git cleanup...');
    
    try {
      // Step 1: Get the latest state from the remote and prune deleted remote branches
      console.log('Fetching and pruning remote...');
      execSync('git fetch --prune');

      // Step 2: Determine the default remote branch (main or master)
      // We check 'origin/main' first, then 'origin/master'
      let mainBranchRef = 'origin/main';
      try {
        // This command checks if 'origin/main' exists. If not, it throws an error.
        execSync('git show-branch origin/main');
      } catch (e) {
        try {
          // 'origin/main' failed, let's try 'origin/master'
          execSync('git show-branch origin/master');
          mainBranchRef = 'origin/master';
        } catch (e2) {
          console.error('Error: Could not find origin/main or origin/master. Aborting.');
          return;
        }
      }
      console.log(`Using "${mainBranchRef}" as the base branch.`);

      // Step 3: Get all local branches that are already merged into the main remote branch
      console.log('Finding merged branches...');
      const mergedBranches = execSync(`git branch --merged ${mainBranchRef}`)
        .toString()
        .split('\n');

      // Step 4: Get the current branch name to avoid deleting it
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
        .toString()
        .trim();

      // Step 5: Filter and delete
      let deleteCount = 0;
      mergedBranches.forEach(branch => {
        // Trim whitespace and remove the '*' that marks the current branch
        const branchName = branch.trim().replace(/^\* /, '');

        // We don't want to delete:
        // 1. Empty lines
        // 2. The main/master branches themselves
        // 3. The branch we are currently on
        // 4. Remote branches (which show up as 'remotes/...')
        if (branchName &&
            !branchName.includes('master') && 
            !branchName.includes('main') &&
            branchName !== currentBranch && 
            !branchName.startsWith('remotes/')) {
          
          console.log(`- Deleting merged branch: ${branchName}`);
          try {
            // Use '-d' (safe delete) not '-D' (force delete)
            execSync(`git branch -d ${branchName}`);
            deleteCount++;
          } catch (deleteError) {
            console.warn(`  -> Could not delete branch "${branchName}". Skipping.`);
          }
        }
      });

      console.log(`\n✅ Successfully deleted ${deleteCount} merged local branches.`);

    } catch (error) {
      console.error('\n❌ An error occurred:');
      // Show just the first line of the error for brevity
      console.error(error.message.split('\n')[0]); 
      console.error('Make sure you are in a git repository.');
    }
  });

// ... (your final 'program.parse(process.argv);' line is below this) ...
// --- Snippet Manager ---

const snippet = program.command('snippet')
  .description('Manage your personal code snippets');

// Command: assist snippet add <name> <tag>
snippet
  .command('add <name> <tag>')
  .description('Save the code from your clipboard as a new snippet')
  .action((name, tag) => {
    try {
      const content = clipboardy.readSync(); // Read from clipboard
      if (!content) {
        console.error('❌ Your clipboard is empty. Copy some code first!');
        return;
      }

      const sql = `INSERT INTO snippets (name, tag, content) VALUES (?, ?, ?)`;
      db.run(sql, [name, tag, content], function(err) {
        if (err) {
          console.error('❌ Error saving snippet:', err.message);
          console.log('Hint: The snippet "name" must be unique.');
        } else {
          console.log(`✅ Snippet "${name}" [${tag}] saved!`);
        }
      });
    } catch (err) {
      console.error('❌ Could not read from clipboard:', err.message);
    }
  });

// Command: assist snippet get <name>
snippet
  .command('get <name>')
  .description('Get a snippet by name and copy it to your clipboard')
  .action((name) => {
    const sql = `SELECT content FROM snippets WHERE name = ?`;

    db.get(sql, [name], (err, row) => {
      if (err) {
        console.error('❌ Database error:', err.message);
      } else if (row) {
        clipboardy.writeSync(row.content); // Write to clipboard
        console.log(`✅ Copied snippet "${name}" to your clipboard!`);
      } else {
        console.error(`❌ No snippet found with the name "${name}".`);
      }
    });
  });

// Command: assist snippet list [tag]
snippet
  .command('list [tag]')
  .description('List all snippets, or filter by tag')
  .action((tag) => {
    let sql = `SELECT name, tag FROM snippets ORDER BY tag, name`;
    let params = [];

    if (tag) {
      sql = `SELECT name, tag FROM snippets WHERE tag = ? ORDER BY name`;
      params.push(tag);
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err.message);
      } else if (rows.length === 0) {
        console.log(tag ? `No snippets found with tag "[${tag}]"` : 'You have no snippets saved.');
      } else {
        console.log('--- Your Snippets ---');
        let currentTag = '';
        rows.forEach(row => {
          if (row.tag !== currentTag) {
            console.log(`\n[${row.tag}]`);
            currentTag = row.tag;
          }
          console.log(`  - ${row.name}`);
        });
      }
    });
  });

  program
  .command('git-status')
  .description('Check the status of your open Pull Requests on GitHub')
  // This is our first async action!
  .action(async () => {
    const token = process.env.GITHUB_TOKEN;
    const user = process.env.GITHUB_USER;

    if (!token || !user) {
      console.error('❌ Error: GITHUB_TOKEN and GITHUB_USER environment variables must be set.');
      console.log('Run: $env:GITHUB_TOKEN="your_token" and $env:GITHUB_USER="your_username"');
      return;
    }

    try {
      // 1. Get the current repository's URL from .git/config
      const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();

      // 2. Parse the URL to get "owner/repo" (e.g., "google/gemini")
      // This regex handles both https:// and git@git.com: URLs
      const repoMatch = remoteUrl.match(/github\.com[:/]([\w.-]+\/[\w.-]+)(\.git)?$/);

      if (!repoMatch || !repoMatch[1]) {
        console.error('❌ Could not parse GitHub repo name from remote URL.');
        return;
      }
      const ownerRepo = repoMatch[1]; // This will be like "your-name/your-repo"

      console.log(`Checking PRs for ${user} in ${ownerRepo}...\n`);

      // 3. Make the API request
      const apiUrl = `https://api.github.com/repos/${ownerRepo}/pulls`;
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          'creator': user,
          'state': 'open'
        }
      });

      // 4. Parse and display the results
      const prs = response.data;
      if (prs.length === 0) {
        console.log('✅ No open pull requests found for you in this repo.');
        return;
      }

      console.log('--- Your Open Pull Requests ---');
      prs.forEach(pr => {
        console.log(`
[${pr.number}] ${pr.title} Status: ${pr.draft ? 'Draft 📝' : 'Open ✅'} Reviews: ${pr.requested_reviewers.length > 0 ? pr.requested_reviewers.map(r => r.login).join(', ') : 'None'} URL: ${pr.html_url} `); });

    } catch (error) {
      console.error(`❌ API Error: ${error.response?.status} ${error.response?.data?.message || error.message}`);
      console.log('Make sure you are in a git repo and your GITHUB_TOKEN has `repo` scope.');
    }
  });

  program
  .command('prs')
  .description('Search for all your open PRs across all of GitHub')
  .action(async () => {
    const token = process.env.GITHUB_TOKEN;
    const user = process.env.GITHUB_USER;

    if (!token || !user) {
      console.error('❌ Error: GITHUB_TOKEN and GITHUB_USER environment variables must be set.');
      console.log('Run: $env:GITHUB_TOKEN="your_token" and $env:GITHUB_USER="your_username"');
      return;
    }

    console.log(`🔍 Searching for all open PRs authored by ${user}...\n`);
    
    try {
      // 1. This time, we use the Search API
      const apiUrl = 'https://api.github.com/search/issues';
      
      // 2. We build a search query. GitHub treats PRs as a type of "issue".
      // This query means "find items that are a PR, are open, and are authored by me"
      const searchQuery = `is:pr is:open author:${user}`;

      // 3. Make the API request
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          q: searchQuery, // The 'q' param is for "query"
          sort: 'updated',
          order: 'desc'
        }
      });

      // 4. The search results are in a property called 'items'
      const prs = response.data.items;

      if (prs.length === 0) {
        console.log('✅ You have no open pull requests. Time to code!');
        return;
      }

      console.log(`--- You have ${prs.length} open PR(s) ---`);

      // 5. Group the PRs by repository for a clean look
      const groupedByRepo = {};
      prs.forEach(pr => {
        // The repo URL is in 'pr.repository_url'. We parse it to get the "owner/repo" name.
        const repoName = pr.repository_url.split('/').slice(-2).join('/');
        
        if (!groupedByRepo[repoName]) {
          groupedByRepo[repoName] = []; // Create an array for this repo if it's new
        }
        groupedByRepo[repoName].push(pr);
      });

      // 6. Loop over our new grouped object and print the results
      for (const repoName in groupedByRepo) {
        console.log(`\n📂 \x1b[1m${repoName}\x1b[0m`); // \x1b[1m is for bold text
        groupedByRepo[repoName].forEach(pr => {
          console.log(`  [#${pr.number}] ${pr.title.trim()}`);
          console.log(`    ${pr.html_url}`);
        });
      }

    } catch (error) {
      console.error(`❌ API Error: ${error.response?.status} ${error.response?.data?.message || error.message}`);
    }
  });

program.parse(process.argv);