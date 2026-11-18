# NoteBurner for Firefox

Send self-destructing encrypted messages from any page. Encryption happens in your browser; the server only stores ciphertext.

Requires **Firefox 142 or newer** (set by `strict_min_version` in `manifest.firefox.json`, which is also what lets the add-on declare that it collects no data).

## Use it

| How | Steps |
|---|---|
| Right-click | Select text, right-click, choose **Send via NoteBurner**. noteburner.work opens with the text prefilled. |
| Popup | Click the toolbar icon (pin it from the puzzle-piece menu if you don't see it). Text you selected on the page is prefilled. Set a password (or generate one), choose an expiry, click **Encrypt & Create Link**, copy the link. |

If the server asks for a human check (Cloudflare Turnstile), the popup opens noteburner.work/create with your text prefilled instead, because the check can't run inside an extension. The text travels in the URL fragment (`#text=`), which is never sent to a server.

## Install for development

Firefox needs its own manifest, so **do not load the `extension/` folder directly** (its `manifest.json` is the Chrome one and will be rejected). Build first:

```bash
./extension/build.sh        # from the repository root
```

Then:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `noteburner-firefox.zip` from the repository root.

A temporary add-on is removed when Firefox closes. After code changes, rebuild and click **Reload** on the add-on's card.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` + `scripting` | Read the text you selected on the current tab, only at the moment you open the popup. There is **no content script**: the add-on does not run on pages you don't use it on. |
| `contextMenus` | The right-click **Send via NoteBurner** item. |
| `storage` | Remember dark mode. |
| Host access: `noteburner.work`, `api.noteburner.work` | Talk to the NoteBurner API. No other site is contacted. |

Data collection: none (`data_collection_permissions: required: none`). Privacy policy: [PRIVACY.md](./PRIVACY.md).

## Differences from the Chrome build

| | Chrome | Firefox |
|---|---|---|
| Manifest file | `manifest.json` | `manifest.firefox.json`, shipped as `manifest.json` inside `noteburner-firefox.zip` |
| Background | `service_worker` | `scripts` (event page) |
| Add-on ID | assigned by the store | `extension@noteburner.work` |

The code (`background.js`, `popup.*`, `crypto.js`) is identical.

## Publish

1. Bump `version` in **both** manifests (the build fails if they differ; addons.mozilla.org rejects a version it already has).
2. Run `./extension/build.sh`.
3. Check the package: `unzip -p noteburner-firefox.zip manifest.json` must show the Firefox manifest (it contains `"gecko"`), and the zip must have `manifest.json` at its top level. The build verifies this and stops if it is wrong.
4. Test it as a temporary add-on (steps above): select text, open the popup, create a message, open the link and check it decrypts.
5. Upload `noteburner-firefox.zip` at https://addons.mozilla.org/developers/.

Reviewers may ask for source: the package is the repository's `extension/` runtime files with no build step or minification, so the source is the zip's contents. Listing text and answers to common review questions: [PUBLISHING.md](./PUBLISHING.md).

## Tests

```bash
npm run test:extension
```

## Troubleshooting

- **"This add-on could not be installed" / manifest errors**: you loaded the Chrome manifest. Load `noteburner-firefox.zip`.
- **"Rate limited, wait N seconds"**: the API limits requests per client; wait and retry.
- **Popup shows no selected text**: pages like `about:` and addons.mozilla.org can't be read by any extension. Paste the text instead.
- **Debugging the popup**: in `about:debugging`, click **Inspect** on the add-on.
