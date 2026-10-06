/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {
    colors: { ink: '#102a43', brand: { 50:'#ecfeff',100:'#cffafe',500:'#0891b2',600:'#0e7490',700:'#155e75' } },
    boxShadow: { soft: '0 12px 40px rgba(15, 73, 92, 0.10)' }
  } },
  plugins: []
};
