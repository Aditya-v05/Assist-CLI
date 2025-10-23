#!/usr/bin/env node

// This first line is called a "shebang".
// It tells the system to execute this file using Node.js.

const { program } = require('commander');

// Define the version and description of your tool
program
  .version('1.0.0')
  .description('A personal CLI assistant for your day-to-day coding life.');

// Define your first, simple command
program
  .command('hello')
  .description('Say hello to your new assistant')
  .action(() => {
    console.log('Hello, Assistant! I am ready to help.');
  });

// This line is essential. It parses the arguments you pass in
// (like 'hello') and runs the correct .action()
program.parse(process.argv);