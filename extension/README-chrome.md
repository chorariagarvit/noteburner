# NoteBurner for Chrome (and Edge, Brave)

Send self-destructing encrypted messages from any page. Encryption happens in your browser; the server only stores ciphertext.

Works on Chrome, Edge, Brave and other Chromium browsers (Manifest V3).

## Use it

| How | Steps |
|---|---|
| Right-click | Select text, right-click, choose **Send via NoteBurner**. noteburner.work opens with the text prefilled. |
| Popup | Click the toolbar icon. Text you selected on the page is prefilled. Set a password (or generate one), choose an expiry, click **Encrypt & Create Link**, copy the link. |

If the server asks for a human check (Cloudflare Turnstile), the popup opens noteburner.work/create with your text prefilled instead, because the check can't run inside an extension. The text travels in the URL fragment (`#text=`), which is never sent to a server.

## Install for development

1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder of this repository.
4. After editing code, click the reload icon on the extension's card.

`manifest.json` is the Chrome manifest. `manifest.firefox.json` is only used for the Firefox build.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` + `scripting` | Read the text you selected on the current tab, only at the moment you open the popup. There is **no content script**: the extension does not run on pages you don't use it on. |
| `contextMenus` | The right-click **Send via NoteBurner** item. |
| `storage` | Remember your theme choice (System, Light or Dark). |
| Host access: `noteburner.work`, `api.noteburner.work` | Talk to the NoteBurner API. No other site is contacted. |

Privacy policy: [PRIVACY.md](./PRIVACY.md).

## Build and publish

```bash
./extension/build.sh        # from the repository root
```

This runs the extension tests, then writes `noteburner-extension.zip` (Chrome) and `noteburner-firefox.zip` (Firefox) to the repository root. The Chrome zip contains only the runtime files, with `manifest.json` at its top level.

Before the first upload of a release:

1. Bump `version` in **both** `manifest.json` and `manifest.firefox.json` (the build fails if they differ, and the store rejects a version it already has).
2. Run `./extension/build.sh`.
3. Unzip `noteburner-extension.zip` to a temporary folder and **Load unpacked** it. Select some text on a page, open the popup, create a message, open the link and check it decrypts.
4. Upload the zip at https://chrome.google.com/webstore/devconsole.

Store listing text, screenshots and permission justifications: [PUBLISHING.md](./PUBLISHING.md).

### Signed CRX (optional)

Only needed for self-hosting or a verified-upload flow; the Web Store zip does not need it. The private key is **not** in this repository. Keep it somewhere private and point the build at it:

```bash
NOTEBURNER_KEY=/path/to/noteburner-private-key.pem ./extension/build.sh
```

Public key and verified-upload steps: [CHROME_WEB_STORE_SIGNING.md](./CHROME_WEB_STORE_SIGNING.md). If the key is lost, an extension with that ID can no longer be updated.

## Tests

```bash
npm run test:extension
```

Checks crypto parity with the web app, the request contract against a mock API, and that both manifests agree (permissions, hosts, no content script, no broad host access).

## Troubleshooting

- **"Rate limited, wait N seconds"**: the API limits requests per client; wait and retry.
- **Popup shows no selected text**: browser pages (`chrome://`, the Web Store) can't be read by any extension. Paste the text instead.
- **Nothing happens on Create**: open the popup, right-click it, choose **Inspect**, and check the Console and Network tabs.
