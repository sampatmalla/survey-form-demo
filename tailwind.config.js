/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                googleSans: ['GoogleSans', 'sans-serif'],
            },
            colors: {
                googleBlue: {
                    50: '#e8f0fe',
                    100: '#c3ddfd',
                    200: '#9cc7fb',
                    300: '#70aef9',
                    400: '#4293f8',
                    500: '#4285f4',
                    600: '#3575e3',
                    700: '#2a63cc',
                    800: '#204ea5',
                    900: '#153977',
                },
            },
        },
    },
    plugins: [],
}
