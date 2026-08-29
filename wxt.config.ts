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
        "open-settings": {
          description: "open settings",
          suggested_key: isDevelopment ? { default: "Alt+O" } : {},
        },
        _execute_browser_action: {
          description: "open popup",
          suggested_key: isDevelopment ? { default: "Alt+K" } : {},
        },
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
