const path = require('path');
const dotenv = require('dotenv');
const { spawnSync } = require('child_process');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const args = process.argv.slice(2);
if (!args.length) process.exit(1);

const command = process.platform === 'win32' ? `${args.join(' ')}` : args.join(' ');
const result = spawnSync(command, { stdio: 'inherit', shell: true, env: process.env });
process.exit(result.status ?? 1);
