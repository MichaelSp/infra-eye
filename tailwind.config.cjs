module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{svelte,js}"
  ],
  theme: { extend: {} },
  plugins: [require("flowbite/plugin")]
}
