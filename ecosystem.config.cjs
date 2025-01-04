module.exports = {
  apps: [
    {
      name: "backend",
      script: "bash",
      args: "shell/back.sh",
      watch: false,
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: "frontend",
      script: "bash",
      args: "shell/front.sh",
      watch: false,
      autorestart: true,
      restart_delay: 5000,
    },
  ],
};
