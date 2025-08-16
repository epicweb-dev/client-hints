import { ClientHint, ClientHintsValue } from './utils.js'

export type { ClientHint, ClientHintsValue }

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

		if (!value) return null

		try {
			return decodeURIComponent(value)
		} catch (error) {
			// Handle malformed URI gracefully by falling back to null
			// This prevents crashes and allows the hint's fallback value to be used
			console.warn(
				`Failed to decode cookie value for ${hint.cookieName}:`,
				error,
			)
			return null
		}
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
// This block of code allows us to check if the client hints have changed and
// force a reload of the page with updated hints if they have so you don't get
// a flash of incorrect content.
function checkClientHints() {
	if (!navigator.cookieEnabled) return;

	// set a short-lived cookie to make sure we can set cookies
	document.cookie = "canSetCookies=1; Max-Age=60; SameSite=Lax; path=/";
	const canSetCookies = document.cookie.includes("canSetCookies=1");
	document.cookie = "canSetCookies=; Max-Age=-1; path=/";
	if (!canSetCookies) return;

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
	
	// Add safety check to prevent infinite refresh scenarios
	let reloadAttempts = parseInt(sessionStorage.getItem('clientHintReloadAttempts') || '0');
	if (reloadAttempts > 3) {
		console.warn('Too many client hint reload attempts, skipping reload to prevent infinite loop');
		return;
	}
	
	for (const hint of hints) {
		document.cookie = encodeURIComponent(hint.name) + '=' + encodeURIComponent(hint.actual) + '; Max-Age=31536000; SameSite=Lax; path=/';
		
		try {
			const decodedValue = decodeURIComponent(hint.value);
			if (decodedValue !== hint.actual) {
				cookieChanged = true;
			}
		} catch (error) {
			// Handle malformed URI gracefully
			console.warn('Failed to decode cookie value during client hint check:', error);
			// If we can't decode the value, assume it's different to be safe
			cookieChanged = true;
		}
	}
	
	if (cookieChanged) {
		// Increment reload attempts counter
		sessionStorage.setItem('clientHintReloadAttempts', String(reloadAttempts + 1));
		
		// Hide the page content immediately to prevent visual flicker
		const style = document.createElement('style');
		style.textContent = 'html { visibility: hidden !important; }';
		document.head.appendChild(style);

		// Trigger the reload
		window.location.reload();
	} else {
		// Reset reload attempts counter if no reload was needed
		sessionStorage.removeItem('clientHintReloadAttempts');
	}
}

checkClientHints();
`
	}

	return { getHints, getClientHintCheckScript }
}
