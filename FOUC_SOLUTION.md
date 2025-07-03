# Flash of Unstyled Content (FOUC) Solution

## Problem Analysis

The issue was in the client hints library's reload mechanism. When client preferences (like color scheme, timezone, reduced motion) changed, the system would trigger a page reload using `window.location.reload()`. However, this simple approach caused a **Flash of Unstyled Content (FOUC)** because:

1. The reload was triggered but the browser continued processing the current HTML document
2. Resource requests on the page got canceled during the reload process
3. This led to partially rendered content without styles before the reload completed

## Root Cause

The problematic code was in `src/index.ts` at line 76-80:

```javascript
if (cookieChanged) window.location.reload();
```

This single line allowed the browser to continue rendering the current page state while initiating the reload, causing the visual flash.

## Solution Implemented

The solution involves a three-step approach to prevent any visual artifacts:

```javascript
if (cookieChanged) {
    // Stop all resource loading and DOM processing to prevent FOUC
    if (window.stop) window.stop();
    
    // Hide the page content immediately to prevent visual flicker
    const style = document.createElement('style');
    style.textContent = 'html { visibility: hidden !important; }';
    document.head.appendChild(style);
    
    // Trigger the reload
    window.location.reload();
}
```

### Step-by-Step Breakdown

1. **Stop Processing**: `window.stop()` immediately halts all current resource loading and DOM processing
2. **Hide Content**: Inject a style tag that makes the entire HTML document invisible using `visibility: hidden !important`
3. **Reload**: Only then trigger the actual page reload

## Benefits of This Approach

- **Eliminates FOUC**: No flash of unstyled content during the transition
- **Backward Compatible**: All existing tests pass without modification
- **Graceful Degradation**: The `if (window.stop)` check ensures compatibility with browsers that might not support this method
- **Immediate Effect**: The visibility hidden style is applied synchronously, preventing any visual artifacts

## Testing & Validation

- ✅ All existing unit tests pass
- ✅ TypeScript compilation succeeds without errors
- ✅ Solution is included in the compiled JavaScript output
- ✅ Maintains the same core functionality while solving the visual issue

## Browser Compatibility

- `window.stop()` is supported in all modern browsers
- The `visibility: hidden` CSS property is universally supported
- The solution gracefully handles edge cases where `window.stop()` might not be available

This solution ensures a smooth user experience during client hint changes while maintaining the library's existing functionality and API.