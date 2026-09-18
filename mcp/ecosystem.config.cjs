module.exports = {
  apps: [
    {
      name: 'celodesk-mcp',
      cwd: '/root/celodesk/mcp',
      script: 'dist/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
