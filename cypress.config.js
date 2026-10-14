const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    viewportWidth: 1440,
    viewportHeight: 900,
    video: true,
    supportFile: false,
  },
});
