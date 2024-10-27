/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#16A34A",
        "background": "#F4F4F5",
        "border": "#B5B5B5",
        "clt-1": '#333333',
        "clt-2": "#232323",
        "cl-icon": "#474747",
        "cl-icon2": "#A9A9A9",
        "cl-table-item": "#EBEBEB",
        "danger": "#DD1313"
      },
      fontFamily: {
        "inter-bold": ['inter-bold', 'serif'],
        "inter-light": ['inter-light', 'serif'],
        "inter-medium": ['inter-medium', 'serif'],
        "inter-regular": ['inter-regular', 'serif'],
        "inter-semibold": ['inter-semibold', 'serif'],
        "inter-thin": ['inter-thin', 'serif'],
        "rajdhani-bold": ['rajdhani-bold', 'sans-serif' ],
        "rajdhani-medium": ['rajdhani-medium', 'sans-serif' ],
        "rajdhani-light": ['rajdhani-light', 'sans-serif' ],
        "rajdhani-regular": ['rajdhani-regular', 'sans-serif' ],
        "rajdhani-semibold": ['rajdhani-semibold', 'sans-serif' ]
      }
    },
  },
  plugins: [],
}

