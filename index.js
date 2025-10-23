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
    const devPath = '/Users/your-username/dev'; // e.g., 'C:/Users/YourName/projects' on Windows
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

// This line should be at the very bottom
program.parse(process.argv);