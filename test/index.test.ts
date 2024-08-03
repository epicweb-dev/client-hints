import { test } from 'node:test'
import { getHintUtils } from '../src/index.js'
import { clientHint as colorSchemeHint } from '../src/color-scheme.js'
import { clientHint as timeZoneHint } from '../src/time-zone.js'
import { clientHint as reducedMotionHint } from '../src/reduced-motion.js'
import assert from 'node:assert'

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
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// fallbacks work
	assert.deepStrictEqual(hints.getHints(), {
		colorScheme: colorSchemeHint.fallback,
		timeZone: timeZoneHint.fallback,
		reducedMotion: reducedMotionHint.fallback,
	})
})

test('getting values from request cookie works', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// getting from request works
	const request = new Request('https://example.com', {
		headers: {
			Cookie:
				'CH-prefers-color-scheme=dark; CH-time-zone=America%2FDenver; CH-reduced-motion=reduce',
		},
	})
	assert.deepStrictEqual(hints.getHints(request), {
		colorScheme: 'dark',
		timeZone: 'America/Denver',
		reducedMotion: 'reduce',
	})
})

test('getting values from document', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// @ts-expect-error poor-man's mock
	global.document = {
		cookie:
			'CH-prefers-color-scheme=dark; CH-time-zone=Lima%2FPeru; CH-reduced-motion=reduce',
	}
	try {
		assert.deepStrictEqual(hints.getHints(), {
			colorScheme: 'dark',
			timeZone: 'Lima/Peru',
			reducedMotion: 'reduce',
		})
	} finally {
		// @ts-expect-error poor-man's mock
		delete global.document
	}
})
