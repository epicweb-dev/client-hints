import { test } from 'node:test'
import { getHintUtils } from '../src'
import { clientHint as colorSchemeHint } from '../src/color-scheme'
import { clientHint as timeZoneHint } from '../src/time-zone'
import assert from 'node:assert'

test('client script works', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
	})

	// meh, this is good enough...
	const checkScript = hints.getClientHintCheckScript()
	if (!checkScript.includes(colorSchemeHint.getValueCode)) {
		throw new Error('check script does not include color scheme hint')
	}
	if (!checkScript.includes(timeZoneHint.getValueCode)) {
		throw new Error('check script does not include time zone hint')
	}
})

test('fallbacks work', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
	})

	// fallbacks work
	assert.deepStrictEqual(hints.getHints(), {
		colorScheme: colorSchemeHint.fallback,
		timeZone: timeZoneHint.fallback,
	})
})

test('getting values from request cookie works', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
	})

	// getting from request works
	const request = new Request('https://example.com', {
		headers: {
			Cookie: 'CH-prefers-color-scheme=dark; CH-time-zone=America%2FDenver',
		},
	})
	assert.deepStrictEqual(hints.getHints(request), {
		colorScheme: 'dark',
		timeZone: 'America/Denver',
	})
})

test('getting values from document', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
	})

	// @ts-expect-error poor-man's mock
	global.document = {
		cookie: 'CH-prefers-color-scheme=dark; CH-time-zone=Lima%2FPeru',
	}
	try {
		assert.deepStrictEqual(hints.getHints(), {
			colorScheme: 'dark',
			timeZone: 'Lima/Peru',
		})
	} finally {
		// @ts-expect-error poor-man's mock
		delete global.document
	}
})
