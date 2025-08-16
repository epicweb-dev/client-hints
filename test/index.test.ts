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

test('handles malformed URI in cookie values gracefully', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// Test with malformed URI that would cause decodeURIComponent to fail
	const request = new Request('https://example.com', {
		headers: {
			Cookie:
				'CH-prefers-color-scheme=dark; CH-time-zone=%C0%AF; CH-reduced-motion=reduce',
		},
	})

	// The malformed timezone should fall back to the fallback value
	const result = hints.getHints(request)
	assert.strictEqual(result.colorScheme, 'dark')
	assert.strictEqual(result.timeZone, timeZoneHint.fallback) // Should fall back due to malformed URI
	assert.strictEqual(result.reducedMotion, 'reduce')
})

test('handles completely malformed cookie values', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// Test with completely invalid URI sequences
	const request = new Request('https://example.com', {
		headers: {
			Cookie:
				'CH-prefers-color-scheme=%C0%AF; CH-time-zone=%FF%FE; CH-reduced-motion=%E0%80%80',
		},
	})

	// All malformed values should fall back to their fallback values
	const result = hints.getHints(request)
	assert.strictEqual(result.colorScheme, colorSchemeHint.fallback)
	assert.strictEqual(result.timeZone, timeZoneHint.fallback)
	assert.strictEqual(result.reducedMotion, reducedMotionHint.fallback)
})

test('handles mixed valid and invalid cookie values', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// Test with mix of valid and invalid values
	const request = new Request('https://example.com', {
		headers: {
			Cookie:
				'CH-prefers-color-scheme=light; CH-time-zone=%C0%AF; CH-reduced-motion=no-preference',
		},
	})

	// Valid values should work, invalid ones should fall back
	const result = hints.getHints(request)
	assert.strictEqual(result.colorScheme, 'light') // Valid value
	assert.strictEqual(result.timeZone, timeZoneHint.fallback) // Invalid value, should fall back
	assert.strictEqual(result.reducedMotion, 'no-preference') // Valid value
})

test('handles empty cookie values gracefully', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	// Test with empty cookie values
	const request = new Request('https://example.com', {
		headers: {
			Cookie: 'CH-prefers-color-scheme=; CH-time-zone=; CH-reduced-motion=',
		},
	})

	// Empty values should fall back to fallback values
	const result = hints.getHints(request)
	assert.strictEqual(result.colorScheme, colorSchemeHint.fallback)
	assert.strictEqual(result.timeZone, timeZoneHint.fallback)
	assert.strictEqual(result.reducedMotion, reducedMotionHint.fallback)
})

test('client script includes infinite refresh prevention', () => {
	const hints = getHintUtils({
		colorScheme: colorSchemeHint,
		timeZone: timeZoneHint,
		reducedMotion: reducedMotionHint,
	})

	const checkScript = hints.getClientHintCheckScript()

	// Should include sessionStorage check for infinite refresh prevention
	assert.ok(checkScript.includes('sessionStorage.getItem'))
	assert.ok(checkScript.includes('clientHintReloadAttempts'))
	assert.ok(checkScript.includes('Too many client hint reload attempts'))

	// Should include try-catch around decodeURIComponent
	assert.ok(checkScript.includes('try'))
	assert.ok(checkScript.includes('catch'))
	assert.ok(checkScript.includes('decodeURIComponent'))
})
