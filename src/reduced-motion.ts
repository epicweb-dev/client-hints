import { type ClientHint } from './utils'

export const clientHint = {
	cookieName: 'CH-reduced-motion',
	getValueCode: `window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference'`,
	fallback: 'no-preference',
	transform(value: string | null) {
		return value === 'reduce' ? 'reduce' : 'no-preference'
	},
} as const satisfies ClientHint<'reduce' | 'no-preference'>
