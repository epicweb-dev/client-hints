import { test } from 'node:test'
import { ClientHint, getHintUtils } from '../src'
import { clientHint as colorSchemeHint } from '../src/color-scheme'
import { clientHint as timeZoneHint } from '../src/time-zone'
import { clientHint as reducedMotionHint } from '../src/reduced-motion'
import assert from 'node:assert'

type CustomHintT = {
	label: string;
	value: number;
}

const customTypeHint: ClientHint<CustomHintT> = {
	cookieName: 'CH-customHint',
	getValueCode: '1',
	fallback: {label: 'two', value: 2},
	transform(e: string) {
		return JSON.parse(e) as CustomHintT
	}
}

const cookieString = 'CH-prefers-color-scheme=dark; CH-customHint={"label": "one", "value": 1}; CH-reduced-motion=reduce; CH-time-zone=America%2FDenver'

test('client script works', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// meh, this is good enough...
	const checkScript = hints.getClientHintCheckScript()
	if (!checkScript.includes(colorSchemeHint.getValueCode)) {
		throw new Error('check script does not include color scheme hint')
	}
	if (!checkScript.includes(timeZoneHint.getValueCode)) {
		throw new Error('check script does not include time zone hint')
	}
	if (!checkScript.includes(reducedMotionHint.getValueCode)) {
		throw new Error('check script does not include reduced motion hint')
	}
})

test('fallbacks work', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		customHint: customTypeHint,
		reducedMotion: reducedMotionHint,
		timeZone: timeZoneHint,
	})

	// fallbacks work
	assert.deepStrictEqual(hints.getHints(), {
		colorScheme: colorSchemeHint.fallback,
		customHint: customTypeHint.fallback,
		reducedMotion: reducedMotionHint.fallback,
		timeZone: timeZoneHint.fallback,
	})
})

test('getting values from request cookie works', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		customHint: customTypeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// getting from request works
	const request = new Request('https://example.com', {
		headers: {
			Cookie: cookieString,
		},
	})
	assert.deepStrictEqual(hints.getHints(request), {
		colorScheme: 'dark',
		customHint: {label: 'one', value: 1},
		timeZone: 'America/Denver',
		reducedMotion: 'reduce',
	})
})

test('getting values from document', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		customHint: customTypeHint,
		reducedMotion: reducedMotionHint,
		timeZone: timeZoneHint,
	})

	// @ts-expect-error poor-man's mock
	global.document = {
		cookie: cookieString,
	}
	try {
		assert.deepStrictEqual(hints.getHints(), {
			colorScheme: 'dark',
			customHint: {label: 'one', value: 1},
			reducedMotion: 'reduce',
			timeZone: 'America/Denver',
		})
	} finally {
		// @ts-expect-error poor-man's mock
		delete global.document
	}
})
