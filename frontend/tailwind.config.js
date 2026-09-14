/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: { primary: '#172D40', detail: '#92764E' },
                market: { up: 'var(--market-up)', down: 'var(--market-down)' },
                slate: {
                    50: '#F4F6F8', 100: '#EDF1F4', 200: '#DFE5E9',
                    300: '#C5D0D8', 400: '#8193A1', 500: '#657582',
                    600: '#4E6373', 700: '#31424F', 800: '#243746',
                    900: '#172530', 950: '#111B24',
                },
                // 保留 trading 命名空间用于特定业务颜色
                trading: {
                    accent: {
                        green: '#287461',
                        red: '#af423f',
                        blue: '#365e7c',
                        cyan: '#47787f',
                        purple: '#626780',
                        orange: '#a5753f',
                        yellow: '#92764e',
                        pink: '#946a77',
                    },
                },
            },
            fontFamily: {
                mono: ['SFMono-Regular', 'Consolas', 'monospace'],
                sans: ['IBM Plex Sans', 'PingFang SC', 'Source Han Sans SC', 'Microsoft YaHei', 'sans-serif'],
                serif: ['Songti SC', 'Source Han Serif SC', 'SimSun', 'serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 3s linear infinite',
            },
        },
    },
    plugins: [],
}
