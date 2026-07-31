#!/usr/bin/env node
require('dotenv').config({ quiet: true });

const logger = require('./utils/logger');

// Command registry: name -> module exposing async run(args, flags).
const COMMANDS = {
  'call-prep': require('./commands/call-prep'),
  'outbound-sync': require('./agents/outbound-sync'),
  'action-items-sync': require('./agents/action-items-sync'),
  'deal-status-sync': require('./agents/deal-status-sync'),
};

/**
 * Split argv into positional args and --flags / -f flags.
 * @param {string[]} argv
 * @returns {{args: string[], flags: Object}}
 */
function parseArgv(argv) {
  const args = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (token.startsWith('-') && token.length === 2) {
      const key = token.slice(1);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(token);
    }
  }
  return { args, flags };
}

function printUsage() {
  const names = Object.keys(COMMANDS).join(', ');
  console.error('f13i — personal intelligence CLI\n');
  console.error('Usage: f13i <command> [args] [flags]\n');
  console.error(`Commands: ${names}\n`);
  console.error('Examples:');
  console.error('  f13i call-prep "Nick from Acme"');
  console.error('  f13i call-prep "Acme" --out brief.md');
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    process.exit(command ? 0 : 1);
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n`);
    printUsage();
    process.exit(1);
  }

  const { args, flags } = parseArgv(rest);
  try {
    await handler.run(args, flags);
  } catch (err) {
    logger.error(`Command "${command}" failed: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

main();
