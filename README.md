<div>
  <h1 align="center"><a href="https://npm.im/@epic-web/client-hints">💡 @epic-web/client-hints</a></h1>
  <strong>
    Eliminate a flash of incorrect content by using client hints
  </strong>
  <p>
    Detect the user's device preferences (like time zone and color scheme) and
    send them to the server so you can server render the correct content for
    them.
  </p>
</div>

```
npm install @epic-web/client-hints
```

<div align="center">
  <a
    alt="Epic Web logo"
    href="https://www.epicweb.dev"
  >
    <img
      width="300px"
      src="https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/257881576-fd66040b-679f-4f25-b0d0-ab886a14909a.png"
    />
  </a>
</div>

<hr />

<!-- prettier-ignore-start -->
[![Build Status][build-badge]][build]
[![MIT License][license-badge]][license]
[![Code of Conduct][coc-badge]][coc]
<!-- prettier-ignore-end -->

## The Problem

Sometimes your server render code needs to know something about the client that
the browser doesn't send. For example, the server might need to know the user's
preferred language, or whether the user prefers light or dark mode.

For some of this you should have user preferences which can be persisted in a
cookie or a database, but you can't do this for first-time visitors. All you can
do is guess. Unfortunately, if you guess wrong, you end up with a bad experience
for the user.

And what often happens is we render HTML that's wrong and then hydrate the
application to be interactive with client-side JavaScript that now knows the
user preferences and now we know the right thing to render. This is great,
except we've already rendered the wrong thing so by hydrating we cause a shift
from the wrong thing to the right thing which is jarring and can be even a worse
user experience than leaving the wrong thing in place (I call this a "flash of
incorrect content"). You'll get an error in the console from React when this
happens for this reason.

## The Solution

Client hints are a way to avoid this problem. The
[standard](https://wicg.github.io/user-preference-media-features-headers/#usage-example)
for this are still a work in progress and there is uncertainty when they will
land in all major browsers we are concerned with supporting. So this is a
"ponyfill" of sorts of a similar feature to the client hints headers proposed to
the standard.

The idea behind the standard is when the browser makes a request, instead of
responding to the request immediately, the server instead responds to the client
informing it there's a need for certain headers. The client will then repeat the
request with those headers added. The server can then respond with the correct
content.

Our solution is inspired by this, but instead of headers we use cookies (which
can actually have a few benefits over headers). The idea is to render some
JavaScript at the top of the `<head>` of our document before anything else. It's
a small and fast inline script which checks the user's cookies for the expected
client hints. If they are not present or if they're outdated, it sets a cookie
and triggers a reload of the page. Effectively doing the same thing the browser
would do with the client hints headers.

This allows us to server render the right thing for first time visitors without
triggering a content layout shift or a flash of incorrect content. After that
first render, the client will have the correct cookies and the server will
render the right thing every time thereafter.

[Watch the tip](https://www.epicweb.dev/tips/use-client-hints-to-eliminate-content-layout-shift)
on [EpicWeb.dev](https://www.epicweb.dev):

[![Kent smiling with VSCode showing code in the client-hints.tsx file](https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/242997340-ede18d0a-c117-4c65-9f1e-a87f262e4ce1.jpg)](https://www.epicweb.dev/tips/use-client-hints-to-eliminate-content-layout-shift)

## Usage

This is how `@epic-web/client-hints` is used in the Epic Stack:

```tsx
import { getHintUtils } from '@epic-web/client-hints'
import {
	clientHint as colorSchemeHint,
	subscribeToSchemeChange,
} from '@epic-web/client-hints/color-scheme'
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zome'
import { useRevalidator } from '@remix-run/react'
import * as React from 'react'
import { useRequestInfo } from './request-info.ts'

const hintsUtils = getHintUtils({
	theme: colorSchemeHint,
	timeZone: timeZoneHint,
	// add other hints here
})

export const { getHints } = hintsUtils

export function useHints() {
	const requestInfo = useRequestInfo()
	return requestInfo.hints
}

export function ClientHintCheck({ nonce }: { nonce: string }) {
	const { revalidate } = useRevalidator()
	React.useEffect(
		() => subscribeToSchemeChange(() => revalidate()),
		[revalidate],
	)

	return (
		<script
			nonce={nonce}
			dangerouslySetInnerHTML={{
				__html: hintsUtils.getClientHintCheckScript(),
			}}
		/>
	)
}
```

And then the server-side code in the root loader (what powers the
`useRequestInfo` hook) looks like this:

```tsx
export async function loader({ request }: DataFunctionArgs) {
	return json({
		// other stuff here...
		requestInfo: {
			hints: getHints(request),
		},
	})
}
```

Hints include:

- `@epic-web/client-hints/color-scheme` (also exports `subscribeToSchemeChange`)
- `@epic-web/client-hints/time-zone`
- `@epic-web/client-hints/reduced-motion` (also exports
  `subscribeToMotionChange`)

## FAQ

### Customize cookie name

If you wish to customize the cookie name, you can simply override it like so:

```tsx
const hintsUtils = getHintUtils({
	theme: {
		...colorSchemeHint,
		cookieName: 'my-custom-cookie-name',
	},
})
```

If you're using one of the `subscribeTo*Change` functions, you'll need to pass
your custom cookie name to those as well.

## Custom Hints

If you have anything custom you'd like to detect, hints are actually pretty
simple. Here's the code for the timezone hint:

```ts
import { type ClientHint } from '@epic-web/client-hints'

export const clientHint = {
	cookieName: 'CH-time-zone',
	getValueCode: 'Intl.DateTimeFormat().resolvedOptions().timeZone',
	fallback: 'UTC',
} as const satisfies ClientHint<string>
```

If you need to transform the value for some reason (like change it from a string
to a boolean etc.) then you can use the `transform` method. Here's how the color
scheme hint uses that:

```ts
import { type ClientHint } from '@epic-web/client-hints'

export const clientHint = {
	cookieName: 'CH-prefers-color-scheme',
	getValueCode: `window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`,
	fallback: 'light',
	transform(value) {
		return value === 'dark' ? 'dark' : 'light'
	},
} as const satisfies ClientHint<'dark' | 'light'>
```

The benefit of doing this is the types for the hint will only ever be
`'dark' | 'light'` and not `string`.

## License

MIT

<!-- prettier-ignore-start -->
[build-badge]: https://img.shields.io/github/actions/workflow/status/epicweb-dev/client-hints/release.yml?branch=main&logo=github&style=flat-square
[build]: https://github.com/epicweb-dev/client-hints/actions?query=workflow%3Arelease
[license-badge]: https://img.shields.io/badge/license-MIT%20License-blue.svg?style=flat-square
[license]: https://github.com/epicweb-dev/client-hints/blob/main/LICENSE
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://kentcdodds.com/conduct
<!-- prettier-ignore-end -->
