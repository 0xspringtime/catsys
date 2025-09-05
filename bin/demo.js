#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

// Find project root (where package.json is)
const projectRoot = path.resolve(__dirname, '..');

// Change to project root
process.chdir(projectRoot);

// Run demo
const result = spawnSync('npm', ['run', 'demo'], {
  stdio: 'inherit',
  shell: true
});

// Exit with the same code as the demo command
process.exit(result.status);
