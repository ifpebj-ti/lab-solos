import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primaryMy: '#16A34A',
        backgroundMy: '#F4F4F5',
        borderMy: '#B5B5B5',
        'clt-1': '#333333',
        'clt-2': '#232323',
        'cl-icon': '#474747',
        'cl-icon2': '#A9A9A9',
        'cl-table-item': '#EBEBEB',
        danger: '#DD1313',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // modifiquei esse primary aqui de baixo pois tava dando conflito
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        'inter-bold': ['inter-bold', 'serif'],
        'inter-light': ['inter-light', 'serif'],
        'inter-medium': ['inter-medium', 'serif'],
        'inter-regular': ['inter-regular', 'serif'],
        'inter-semibold': ['inter-semibold', 'serif'],
        'inter-thin': ['inter-thin', 'serif'],
        'rajdhani-bold': ['rajdhani-bold', 'sans-serif'],
        'rajdhani-medium': ['rajdhani-medium', 'sans-serif'],
        'rajdhani-light': ['rajdhani-light', 'sans-serif'],
        'rajdhani-regular': ['rajdhani-regular', 'sans-serif'],
        'rajdhani-semibold': ['rajdhani-semibold', 'sans-serif'],
      },
      // borderRadius: {
      // 	lg: 'var(--radius)',
      // 	md: 'calc(var(--radius) - 2px)',
      // 	sm: 'calc(var(--radius) - 4px)'
      // }
    },
  },
  plugins: [animate],
};
