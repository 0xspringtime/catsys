#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

// Find project root (where package.json is)
const projectRoot = path.resolve(__dirname, '..');

// Change to project root
process.chdir(projectRoot);

// Run tests
const result = spawnSync('npm', ['test'], {
  stdio: 'inherit',
  shell: true
});

// Exit with the same code as the test command
process.exit(result.status);
