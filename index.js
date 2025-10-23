#!/usr/bin/env node

// This first line is called a "shebang".
// It tells the system to execute this file using Node.js.

const { program } = require('commander');
const { execSync } = require('child_process');

// Define the version and description of your tool
program
  .version('1.0.0')
  .description('A personal CLI assistant for your day-to-day coding life.');

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

// This line should be at the very bottom
program.parse(process.argv);