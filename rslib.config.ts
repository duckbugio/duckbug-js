export default {
  lib: [
    {
      format: "esm",
      syntax: "es2022",
      source: {
        tsconfigPath: "./tsconfig.esm.json",
      },
      output: {
        distPath: {
          root: "dist/esm",
        },
      },
    },
    {
      format: "cjs",
      syntax: "es2022",
      source: {
        tsconfigPath: "./tsconfig.cjs.json",
      },
      output: {
        distPath: {
          root: "dist/cjs",
        },
      },
    },
  ],
  bundle: false,
  dts: true,
  output: {
    target: "node",
  },
};
