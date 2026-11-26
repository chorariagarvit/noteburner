# Chrome Web Store: verified uploads and signing

The Chrome Web Store checks that each upload is signed with the private key whose **public key** is registered on the
developer dashboard. This file says how that is set up, how to build a signed package, and what to do if the key is lost.

> The key was rotated on Nov 26, 2026 (Google support reset the registered key). The old key is retired and must not be reused.

## Registered public key

Safe to share: this is the only half that goes to Google.

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwhU4z46H5zgDoH+WpawA
ozoHLrNg0dl5X/hLE1gZDT44hVBlRojiEwlARksjT6gSp+0/7qXaHzq0pmJGZy70
FXdCbaF73hSHdmd8oh+zLnFj3Eq1TdHQqoxwW8e0g4rxf3Iabns9ixk72Oom7MEZ
8JgjI/+aaxViMqn4dCPLYoXA8wP24DOhpM1h2hoT0PrzUs4DyLlUw6B7acYdhnlH
SRDa1ci7e7/S2SQOHTX7pSnQzGWfmJp9h6dTNU7EVm2tqJ8bcMOUdkSGFJQo2frN
UE4pX7OXSHla8WFu531OSL2PCjoT+M6vi/bkwXbcE9KPRItvSx3N2bphmuSznIu+
NQIDAQAB
-----END PUBLIC KEY-----
```

Registered at: Chrome Web Store developer dashboard → Account → **Verified Upload Public Key**.

## Where the keys live

The key pair is kept **outside the repository**, in a folder next to it (`../noteburner-keys/`), and backed up in a password manager:

```
noteburner-keys/
├── noteburner-private-key.pem   ← SECRET. Never commit, never share. Needed for every Chrome release.
└── noteburner-public-key.pem    ← the key above
```

`extension/` holds no keys. `*.pem` is git-ignored as a second line of defence, and the packages built by `build.sh` never contain a key.

## Build a signed package

```bash
NOTEBURNER_KEY=../noteburner-keys/noteburner-private-key.pem ./extension/build.sh
```

This writes `noteburner-extension.zip` (upload this to the store), `noteburner-extension.crx` (signed with the key) and
`noteburner-firefox.zip` to the repository root. All three are git-ignored.

## If the private key is lost or leaked

1. Generate a new pair (outside the repo):
   ```bash
   openssl genrsa -out noteburner-private-key.pem 2048
   openssl rsa -in noteburner-private-key.pem -pubout -out noteburner-public-key.pem
   ```
2. Contact Chrome Web Store developer support and ask them to reset the verified-upload key (it cannot be changed from the dashboard once set), then register the new public key.
3. Replace the public key block in this file, back up the new private key, and build with `NOTEBURNER_KEY` as above.

Firefox does not use this key: Mozilla signs add-ons after review.
