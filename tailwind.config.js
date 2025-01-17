import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: '#E6522C',
				gray: {
					50: '#F9F9F9',
					100: '#F5F5F5',
					200: '#E6E6E6',
					300: '#D4D4D4',
					400: '#B4B4B4',
					500: '#9B9B9B',
					600: '#676767',
					700: '#4D4D4D',
					800: 'var(--color-gray-800, #3D3D3D)',
					850: 'var(--color-gray-850, #2D2D2D)',
					900: 'var(--color-gray-900, #1D1D1D)',
					950: 'var(--color-gray-950, #0D0D0D)'
				}
			},
			typography: {
				DEFAULT: {
					css: {
						pre: false,
						code: false,
						'pre code': false,
						'code::before': false,
						'code::after': false
					}
				}
			},
			padding: {
				'safe-bottom': 'env(safe-area-inset-bottom)'
			}
		}
	},
	plugins: [typography]
};
