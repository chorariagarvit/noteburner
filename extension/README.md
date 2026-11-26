# NoteBurner Browser Extension

🔥 Send self-destructing, end-to-end encrypted messages from any webpage. Version v1.15.1 (Manifest V3) for Chrome, Edge, Brave and Firefox.

## Features

- **Right-click menu**: select text, right-click, **Send via NoteBurner**; the website opens with your text prefilled
- **Quick popup**: click the toolbar icon, type or paste a message (selected text is prefilled), set a password, choose an expiry and get a one-time link
- **Password generator**, and a popup that follows your system light or dark setting (or pin it with the theme button)
- **Private by design**: encryption happens in your browser (AES-256-GCM); only ciphertext and a password-derived proof are sent; no tracking, analytics or data collection
- **Only runs when you use it**: there is no content script and nothing is injected into pages

## Install

- **Firefox (142 or newer)**: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/noteburner/)
- **Chrome / Edge / Brave**: the Chrome Web Store listing is being updated to 1.15.1
- **From source**: [README-chrome.md](./README-chrome.md) (Chromium browsers, load the folder unpacked) or [README-firefox.md](./README-firefox.md) (build first: Firefox needs its own manifest)

## Using it

1. **Context menu**: select text, right-click, choose **Send via NoteBurner**.
2. **Popup**: click the icon, enter the message and a password (or generate one), pick an expiry (1 hour to 7 days, or none), click **Encrypt & Create Link**, then copy the link.
3. If the server asks for a human check (Cloudflare Turnstile), the popup opens noteburner.work/create with your text in the URL fragment (`#text=`, which is never sent to a server), because the check cannot run inside an extension.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` + `scripting` | Read the text you selected on the current tab, only when you open the popup |
| `contextMenus` | The right-click item |
| `storage` | Remember your theme choice (System, Light or Dark) |
| Hosts `noteburner.work`, `api.noteburner.work` | Talk to the NoteBurner API; no other site is contacted |

Privacy policy: [PRIVACY.md](./PRIVACY.md).

## Files

- `manifest.json` (Chrome) and `manifest.firefox.json` (Firefox; shipped as `manifest.json` in its package)
- `background.js` (context menu), `popup.html`, `popup.js`, `popup.css`, `crypto.js` (the same crypto as the web app, with a parity test), `icons/`
- `build.sh` builds `noteburner-extension.zip` (Chrome) and `noteburner-firefox.zip` from an allowlist of runtime files, runs the tests first and checks the result; an optional signed `.crx` is built when `NOTEBURNER_KEY` points to your signing key
- [PUBLISHING.md](./PUBLISHING.md): store listing text, permission justifications and the submission checklist

## Develop and test

```bash
npm run test:extension     # from the repository root: crypto parity with the web app, the request contract against a mock API, manifest and source checks
./extension/build.sh       # builds the store packages into the repository root
```

## Changelog

See the repository [CHANGELOG.md](../CHANGELOG.md). Extension changes in 1.15.1: the popup follows the system light or dark setting (System, Light, Dark button) and the Firefox manifest declares the data it sends. In 1.15.0: standard `scrollbar-color` and `scrollbar-width` in the popup (with a dark variant); versions aligned with the web app; packages built from an allowlist (the Firefox package previously had no `manifest.json`); the unused `notifications` permission dropped. 1.14.0 removed the all-sites content script and added the signed app token.

## License

MIT
