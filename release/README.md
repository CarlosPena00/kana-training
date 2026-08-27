# Release artifacts

Everything in this folder is generated and gitignored. Each build is reproducible from its tagged
commit, so the binaries are not worth versioning — but they are worth keeping where you can find
them at upload time.

| File | What it is |
|------|------------|
| `kana-flashcards-<version>.aab` | The signed App Bundle to upload to Google Play |

## Rebuilding

```bash
cd app
npm run android:aab
cp android/app/build/outputs/bundle/release/app-release.aab ../release/kana-flashcards-<version>.aab
```

Signing reads `app/android/keystore.properties`, which is also gitignored. Without it the release
build produces an unsigned bundle that Play will reject.

## Before each release

1. Bump `versionName` and `versionCode` in `app/android/app/build.gradle` — a version code is
   consumed the moment it reaches the Console and can never be reused.
2. Run the full suite: `npm test && npm run test:e2e && npm run lint`.
3. Build, then tag the commit: `git tag -a v<version>`.

Listing assets, store copy, and the Data safety answers are in `app/store/`.
