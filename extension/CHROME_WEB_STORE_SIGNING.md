# Chrome Web Store - Verified Upload Public Key

## Public Key (PEM Format)

**Submit this public key to Chrome Web Store for verified uploads:**

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwnNwNA9MtZaV0+ts7xid
urDZHJ8moE69KzaOfr6iGXnvkywh7NP44+ipNhh9RUKh0a4xCw6qIzE0Pys7trbH
OWgTc400Nv7xiEXzQl1nj1avwtVkYPUAdbrvIMWQParqVs76a9pOBzNSpLj2gqN7
qECkS5GPJ+9fn89uhS9H+KQ5YLOoPcv/Hth2bMavUGbYIeRNreowOLJpN+CEXztw
4Ko2ChAt2cs0Lm5skBFS3zVm4owYKtZeJpjQPBmx9twZVCyhe1ASTh3u9sKx2d/J
LGBCGf/2uBVAGNNQuwhFek6Vjgq3HVBImaq+OfigheglqDNCLD5DE2/6+5MHpT73
wwIDAQAB
-----END PUBLIC KEY-----
```

## How to Submit Public Key to Chrome Web Store

1. **Go to Chrome Web Store Developer Dashboard**
   - URL: https://chrome.google.com/webstore/devconsole

2. **Navigate to your extension (or create new extension)**

3. **Go to "Account" tab in the left sidebar**

4. **Scroll to "Verified Upload Public Key" section**

5. **Paste the public key above** (including BEGIN/END markers)

6. **Click "Save" or "Update"**

## Benefits of Verified Upload

✅ **Added Security**: Only updates signed with your private key can be uploaded
✅ **Prevent Hijacking**: Even if your account is compromised, attackers can't upload malicious updates
✅ **Trust Signal**: Shows you take security seriously
✅ **CRX Signing**: All future uploads must include CRX files signed with your private key

## Private Key Security

⚠️ **CRITICAL: Keep `noteburner-private-key.pem` SECURE**

- **Never commit to Git** (already in .gitignore)
- **Never share publicly**
- **Store in secure location** (password manager, encrypted drive)
- **Backup securely** (you cannot recover if lost)
- **Required for all future updates**

### Recommended Storage Locations

1. **Password Manager** (1Password, Bitwarden, LastPass)
2. **Encrypted USB drive** (offline backup)
3. **Secure cloud storage** (encrypted vault)
4. **Hardware Security Module (HSM)** (enterprise)

## How to Sign CRX Files for Upload

### Method 1: Using Chrome CLI (Recommended)

```bash
# Pack extension with your private key
google-chrome --pack-extension=/path/to/extension \
              --pack-extension-key=/path/to/noteburner-private-key.pem
```

### Method 2: Using crx3 Node Package

```bash
# Install crx3
npm install -g crx3

# Create signed CRX
crx3 /path/to/extension \
     -p noteburner-private-key.pem \
     -o noteburner.crx
```

### Method 3: Manual Upload to Chrome Web Store

When you upload via the Chrome Web Store dashboard:

1. **Zip your extension** (without private key)
2. **Upload the zip** to Chrome Web Store
3. Chrome will **automatically sign** with your private key if you've set up verified uploads
4. You may need to **provide the private key** during upload flow

## File Structure

```
extension/
├── noteburner-private-key.pem  ← KEEP SECURE (in .gitignore)
├── noteburner-public-key.pem   ← Submit to Chrome Web Store
├── manifest.json
├── popup.html
├── popup.js
└── ... (other extension files)
```

## Key Information

- **Algorithm**: RSA
- **Key Size**: 2048 bits
- **Format**: PEM (Privacy-Enhanced Mail)
- **Generated**: January 20, 2026
- **Purpose**: Chrome Web Store verified uploads

## Troubleshooting

### "Invalid public key" error

- Ensure you copied the **entire key** including `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----`
- Check for **no extra spaces or newlines**
- Make sure key is in **PEM format** (not DER or other formats)

### "Signature verification failed" error

- You may be using the **wrong private key**
- Ensure private key **matches the public key** submitted
- Re-generate keys if you've lost the private key

### Lost private key?

⚠️ If you lose `noteburner-private-key.pem`:

1. **Generate new key pair** (this document's steps)
2. **Update public key** in Chrome Web Store dashboard
3. **Future uploads** will use new key
4. **Cannot update existing versions** with old key (but can publish new versions)

## Firefox Add-ons

**Note**: Firefox does NOT require this type of signing. Firefox Add-ons are signed automatically by Mozilla after review. This key is **only for Chrome Web Store**.

## Next Steps

1. ✅ Public key generated and displayed above
2. ⏳ Submit public key to Chrome Web Store dashboard
3. ⏳ Secure private key in safe location
4. ⏳ Add private key to .gitignore (already done)
5. ⏳ Test signing process with first upload
6. ⏳ Document backup location of private key

---

**Generated**: January 20, 2026  
**Extension**: NoteBurner Browser Extension v1.0.0  
**Security Level**: RSA-2048
