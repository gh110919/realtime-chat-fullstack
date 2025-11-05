module.exports = {
  apps: [
    {
      name: "backend",
      script: "bash",
      args: "cmd/backend.sh",
      watch: false,
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: "frontend",
      script: "bash",
      args: "cmd/frontend.sh",
      watch: false,
      autorestart: true,
      restart_delay: 5000,
    },
  ],
};
