import { ClientHint, ClientHintsValue } from './utils'

export type { ClientHint }

export function getHintUtils<Hints extends Record<string, ClientHint<any>>>(
	hints: Hints,
) {
	function getCookieValue(cookieString: string, name: string) {
		const hint = hints[name]
		if (!hint) {
			throw new Error(
				`Unknown client hint: ${typeof name === 'string' ? name : 'Unknown'}`,
			)
		}
		const value = cookieString
			.split(';')
			.map((c: string) => c.trim())
			.find((c: string) => c.startsWith(hint.cookieName + '='))
			?.split('=')[1]

		return value ? decodeURIComponent(value) : null
	}

	function getHints(request?: Request): ClientHintsValue<Hints> {
		const cookieString =
			typeof document !== 'undefined'
				? document.cookie
				: typeof request !== 'undefined'
				  ? request.headers.get('Cookie') ?? ''
				  : ''

		return Object.entries(hints).reduce((acc, [name, hint]) => {
			const hintName = name
			if ('transform' in hint) {
				// @ts-expect-error - this is fine (PRs welcome though)
				acc[hintName] = hint.transform(
					getCookieValue(cookieString, hintName) ?? hint.fallback,
				)
			} else {
				// @ts-expect-error - this is fine (PRs welcome though)
				acc[hintName] = getCookieValue(cookieString, hintName) ?? hint.fallback
			}
			return acc
		}, {} as ClientHintsValue<Hints>)
	}

	/**
	 * This returns a string of JavaScript that can be used to check if the client
	 * hints have changed and will reload the page if they have.
	 */
	function getClientHintCheckScript() {
		return `
const cookies = document.cookie.split(';').map(c => c.trim()).reduce((acc, cur) => {
	const [key, value] = cur.split('=');
	acc[key] = value;
	return acc;
}, {});
let cookieChanged = false;
const hints = [
${Object.values(hints)
	.map((hint) => {
		const cookieName = JSON.stringify(hint.cookieName)
		return `{ name: ${cookieName}, actual: String(${hint.getValueCode}), value: cookies[${cookieName}] != null ? cookies[${cookieName}] : encodeURIComponent("${hint.fallback}") }`
	})
	.join(',\n')}
];
for (const hint of hints) {
	document.cookie = encodeURIComponent(hint.name) + '=' + encodeURIComponent(hint.actual) + '; Max-Age=31536000; path=/';
	if (decodeURIComponent(hint.value) !== hint.actual) {
		cookieChanged = true;
	}
}
// if the cookie changed, reload the page, unless the browser doesn't support
// cookies (in which case we would enter an infinite loop of reloads)
if (cookieChanged && navigator.cookieEnabled) {
	window.location.reload();
}
			`
	}

	return { getHints, getClientHintCheckScript }
}
