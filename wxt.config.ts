import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/auto-icons"],
  imports: false,
  zip: {
    artifactTemplate: "firefox.xpi",
  },
  manifest: ({ mode }) => {
    const isDevelopment = mode === "development";

    return {
      permissions: ["storage"],
      commands: {
        _execute_browser_action: {
          description: "open settings",
          suggested_key: isDevelopment ? { default: "Alt+O" } : {},
        },
      },
      browser_action: {
        default_title: "open vico settings",
      },
      browser_specific_settings: {
        gecko: {
          id: "{ac7945b9-252e-43ae-b047-23d50acf61ab}",
          data_collection_permissions: {
            required: ["none"],
          },
        },
      },
    };
  },
});
