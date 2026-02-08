/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- INI YANG BARU
    autoprefixer: {},
  },
};

export default config;