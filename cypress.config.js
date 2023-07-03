const { defineConfig } = require("cypress");

module.exports = defineConfig({
  supportFile: false,
  projectId: "ke9m71"
e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});

