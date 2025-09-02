const tsConfigPaths = require("tsconfig-paths");

tsConfigPaths.register({
  baseUrl: "./dist",
  paths: {
    "@/*": ["*"],
  },
  addExtensions: [".js"], // Add .js extension to the resolved paths
});
