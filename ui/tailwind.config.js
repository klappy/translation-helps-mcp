/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// Custom color palette for 2025 design
				primary: {
					50: '#faf5ff',
					100: '#f3e8ff',
					200: '#e9d5ff',
					300: '#d8b4fe',
					400: '#c084fc',
					500: '#a855f7',
					600: '#9333ea',
					700: '#7c3aed',
					800: '#6b21a8',
					900: '#581c87',
					950: '#3b0764'
				},
				secondary: {
					50: '#eff6ff',
					100: '#dbeafe',
					200: '#bfdbfe',
					300: '#93c5fd',
					400: '#60a5fa',
					500: '#3b82f6',
					600: '#2563eb',
					700: '#1d4ed8',
					800: '#1e40af',
					900: '#1e3a8a',
					950: '#172554'
				}
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
				'slide-up': 'slideUp 0.3s ease-out',
				'slide-down': 'slideDown 0.3s ease-out',
				'scale-in': 'scaleIn 0.2s ease-out',
				'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
				float: 'float 6s ease-in-out infinite',
				shimmer: 'shimmer 1.5s infinite'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideUp: {
					'0%': { transform: 'translateY(10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				slideDown: {
					'0%': { transform: 'translateY(-10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				scaleIn: {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				pulseGlow: {
					'0%, 100%': { opacity: '0.1', transform: 'scale(1)' },
					'50%': { opacity: '0.2', transform: 'scale(1.05)' }
				},
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				shimmer: {
					'0%': { backgroundPosition: '-200px 0' },
					'100%': { backgroundPosition: 'calc(200px + 100%) 0' }
				}
			},
			backdropBlur: {
				xs: '2px'
			},
			boxShadow: {
				glow: '0 0 20px rgba(168, 85, 247, 0.3)',
				'glow-lg': '0 0 40px rgba(168, 85, 247, 0.4)',
				'inner-glow': 'inset 0 0 20px rgba(168, 85, 247, 0.2)'
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				mono: ['Fira Code', 'monospace']
			}
		}
	},
	plugins: [
		// @ts-expect-error - Tailwind plugin import
		require('@tailwindcss/typography')
	]
};
