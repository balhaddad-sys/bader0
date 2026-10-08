# Cranial nerve localiser

An offline teaching atlas for Android. Mark examination findings and it ranks
the anatomical sites that best explain them, shows the involved brainstem
structures, and lets you practise on generated cases. It is a teaching aid, not
a diagnostic tool.

## What is in 2.0

- **Practice tab.** Cases are generated from the atlas and used only when the
  model ranks the intended site first by at least 0.04. The other choices are
  its nearest rivals plus one wider distractor. Feedback names the key clues,
  explains why a wrong choice fails and shows the brainstem section. Score,
  streak and topic are saved on the device.
- **Brainstem sections.** Midbrain, mid pons, caudal pons and medulla are drawn
  as axial schematics in MRI orientation. The results view shades the leading
  region and every structure that a present finding involves, and outlines
  structures whose findings were tested normal. Reference has a browsable copy.
- **Finding guide.** Each of the 69 findings has an ⓘ sheet covering how to
  examine it and which sites it defines or supports. Search also understands
  plain words such as "double vision" or "droopy eyelid".
- **New content.** Smell (CN I); Foster Kennedy syndrome; giant cell arteritis;
  pituitary apoplexy; and the HINTS examination (head impulse, nystagmus, skew)
  with vestibular neuritis, labyrinthitis and central acute vestibular
  syndrome. There are now 67 sites and 24 classic cases grouped by topic, plus
  two new bedside rules.
- **Copy summary.** Copies a plain-text list of the findings and the top three
  patterns, ready to paste into notes.

## Layout

```
src/            the app: index.html with {{placeholders}} for the parts below
  fonts.css     embedded Atkinson Hyperlegible and Spectral (OFL)
  styles.css
  data.js       sites, findings, cases, zones, topics, reference text
  model.js      scoring, ranking, "examine next", practice case generation
  anatomy.js    sagittal hero art, brainstem sections and their structures
  app.js        interface
tests/          node tests for data integrity and model behaviour
tools/          build_html.py, build_apk.py, apk.py (packaging and v2 signing)
android/shell/  the prebuilt Android wrapper taken from release 1.2.0
android/version.json
releases/       signed APKs
```

## Build and test

```sh
node --test                           # data and model tests
python3 -m unittest discover -s tests # manifest patching
python3 tools/build_html.py           # writes dist/atlas.html (open it in a browser)
pip install cryptography              # once
CNL_STOREPASS=... python3 tools/build_apk.py --keystore path/to/release.p12
```

`build_apk.py` reuses the compiled shell (`classes.dex`, resources and icons),
sets the version and app id from `android/version.json` in the binary manifest, stores
`resources.arsc` uncompressed and aligned, and signs with APK Signature Scheme
v2, which is enough for the app's minSdk of 26. To check a build independently:

```sh
pip install apksigtool && apksigtool verify dist/cranial-nerve-localiser-2.0.1.apk
```

### Application id and signing

From 2.0.1 the app id is `org.bedsideatlas.craniallocaliser2`, set by
`applicationId` in `android/version.json`. Release 1.2.0 used
`org.bedsideatlas.craniallocaliser` with a different signing key, so 2.0.1
installs as a separate app beside it instead of failing with "App not
installed". You can uninstall 1.2.0 whenever you like; findings saved in it do
not carry over. The compiled classes keep their original Java package, and
`patch_manifest` writes the activity's full class name so the new id still
finds it. Leave `applicationId` out to keep the shell's original id.

Every later release must keep this app id and be signed with the 2.0 keystore,
or Android will refuse to update it in place. Keep the keystore safe and out of
git.

## The Android shell

The wrapper loads `assets/atlas.html` into a WebView. It blocks every
non-`data:` request and opens external `https` links in the browser. Its Back
button runs a fixed script that relies on these elements, so keep them:

- `dialog[open]`, which Back closes;
- `#view-reference`, the wrapper for the Practice and Reference panels; while
  it is visible, Back clicks `#tab-localise`;
- `#marked-review`, `#workspace[data-mobile-view]`, `#mobile-examination`,
  `#finding-search` and `#search-clear`.

New overlays should be `<dialog>` elements and new secondary views should live
inside `#view-reference`.
