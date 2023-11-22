import { type ClientHint } from './utils'

export const clientHint = {
	cookieName: 'CH-prefers-color-scheme',
	getValueCode: `window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`,
	fallback: 'light',
	transform(value) {
		return value === 'dark' ? 'dark' : 'light'
	},
} as const satisfies ClientHint<'dark' | 'light'>

export function subscribeToSchemeChange(
	subscriber: (value: 'dark' | 'light') => void,
) {
	const schemaMatch = window.matchMedia('(prefers-color-scheme: dark)')
	function handleThemeChange() {
		const value = schemaMatch.matches ? 'dark' : 'light'
		document.cookie = `${clientHint.cookieName}=${value}`
		subscriber(value)
	}
	schemaMatch.addEventListener('change', handleThemeChange)
	return function cleanupSchemaChange() {
		schemaMatch.removeEventListener('change', handleThemeChange)
	}
}
