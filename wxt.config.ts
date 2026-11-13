import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/auto-icons", "@wxt-dev/module-vue"],
  imports: false,
  zip: {
    artifactTemplate: "firefox.xpi",
  },
  manifest: ({ mode, manifestVersion }) => {
    const isMv2 = manifestVersion === 2;
    const isDevelopment = mode === "development" && isMv2;
    const default_title = "open vico settings";

    return {
      permissions: ["storage"],
      browser_specific_settings: {
        gecko: {
          id: "{ac7945b9-252e-43ae-b047-23d50acf61ab}",
          data_collection_permissions: {
            required: ["none"],
          },
        },
      },
      ...(isDevelopment && {
        commands: {
          _execute_browser_action: {
            description: "open settings",
            suggested_key: { default: "Alt+O" },
          },
        },
      }),
      ...(isMv2
        ? { browser_action: { default_title } }
        : { action: { default_title } }),
    };
  },
});
