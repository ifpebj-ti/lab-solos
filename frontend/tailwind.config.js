import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primaryMy: 'rgb(var(--color-action) / <alpha-value>)',
        backgroundMy: 'rgb(var(--color-canvas) / <alpha-value>)',
        borderMy: 'rgb(var(--color-border) / <alpha-value>)',
        'clt-1': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'clt-2': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'cl-icon': 'rgb(var(--color-icon) / <alpha-value>)',
        'cl-icon2': 'rgb(var(--color-icon-muted) / <alpha-value>)',
        'cl-table': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        'cl-table-item': 'rgb(var(--color-table-row) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-selected': 'rgb(var(--color-surface-selected) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        focus: 'rgb(var(--color-focus) / <alpha-value>)',
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
        sidebar: {
          DEFAULT: 'rgb(var(--color-navigation) / <alpha-value>)',
          foreground:
            'rgb(var(--color-navigation-foreground) / <alpha-value>)',
          primary:
            'rgb(var(--color-navigation-foreground) / <alpha-value>)',
          'primary-foreground':
            'rgb(var(--color-navigation) / <alpha-value>)',
          accent: 'rgb(var(--color-surface-selected) / <alpha-value>)',
          'accent-foreground':
            'rgb(var(--color-text-primary) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          ring: 'rgb(var(--color-focus) / <alpha-value>)',
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
      scale: {
        99: '0.99',
        customScale: '1.002',
      },
      animation: {
        slowPulse: 'slow-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        'slow-pulse': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.4',
          },
        },
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
    },
  },
  plugins: [animate],
};
