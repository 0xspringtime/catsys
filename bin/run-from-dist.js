#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

// Get command line arguments
const [,, command, ...args] = process.argv;

// Find project root (where package.json is)
const projectRoot = path.resolve(__dirname, '..');

// Get current working directory relative to project root
const cwd = process.cwd();
const relPath = path.relative(projectRoot, cwd);

// Only proceed if we're in dist or a subdirectory
if (!relPath.startsWith('dist')) {
  console.error('Error: This script must be run from the dist directory or its subdirectories');
  process.exit(1);
}

// Map of commands to their npm script names
const commandMap = {
  'test': 'test',
  'demo': 'demo',
  'example': 'example'
};

if (!commandMap[command]) {
  console.error(`Error: Unknown command "${command}"`);
  console.error('Available commands: test, demo, example');
  process.exit(1);
}

// Run the command
const result = spawnSync('npm', ['run', commandMap[command], ...args], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

// Exit with the same code as the command
process.exit(result.status);
