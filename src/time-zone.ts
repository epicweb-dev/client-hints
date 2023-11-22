import { type ClientHint } from './utils'

export const clientHint = {
	cookieName: 'CH-time-zone',
	getValueCode: 'Intl.DateTimeFormat().resolvedOptions().timeZone',
	fallback: 'UTC',
} as const satisfies ClientHint<string>
