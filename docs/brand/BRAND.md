# Kinshasa Label — brand kit

Extracted from the live site code on 8 October 2026. Nothing in the app was changed to produce it. Machine-readable values are in [`tokens.json`](tokens.json).

**Signature:** « Vis Kin autrement »
**One line:** Le guide joyeux de Kinshasa : bonnes adresses, sorties, culture et actualité de la ville — commune par commune, sur une carte interactive.

---

## 1. Logo

The client supplied the logo as a JPEG (`logo/original/`). It was redrawn as vector art for the site.

The logo is a Ferris wheel in the Congo flag colours, a blue tower, a red "K" with a yellow sun-pin, and a blue river wave.

| File | Use |
|---|---|
| `logo/original/Kinshasa_Label_Logo_client-original.jpeg` | Client's original artwork (reference only, white background). |
| `logo/svg/kinshasa-label-logo.svg` | **Main logo**, full detail. Same file as `public/logo.svg` on the site. |
| `logo/svg/kinshasa-label-icon-simplified.svg` | Simplified drawing with thicker strokes for small sizes (browser tab). Same as `src/app/icon.svg`. |
| `logo/svg/kinshasa-label-logo-on-dark.svg` | Logo on a white disc, for dark or photo backgrounds (the site does the same in its hero). |
| `logo/svg/kinshasa-label-lockup.svg` | Logo + "Kinshasa Label" + "VIS KIN AUTREMENT", for light backgrounds (font embedded). |
| `logo/svg/kinshasa-label-lockup-on-dark.svg` | Same lockup for dark backgrounds: white "Kinshasa", yellow "Label". |
| `logo/png/logo-1024-transparent.png`, `logo-1024-on-white.png`, `logo-512-on-light.png` | PNG logo on transparent, white or page-blue backgrounds. |
| `logo/png/logo-1024-on-dark.png`, `logo-1024-on-dark-transparent.png` | PNG logo for dark backgrounds (with white disc). |
| `logo/png/lockup-2800-*.png` | PNG lockups: transparent, on white, on dark navy. |
| `icons/icon-512.png`, `icon-192.png`, `apple-touch-icon-180.png`, `favicon-32.png`, `favicon-16.png` | App and browser icons. |

**Usage rules**

- Keep clear space around the logo of at least ¼ of its width. Don't place it smaller than 32 px on screen; under 64 px, use the simplified icon.
- On dark or busy backgrounds, always use an "on-dark" file (white disc). Never put the full-colour logo straight on navy or on a photo.
- Don't recolour, stretch, rotate, add shadows or outlines, or redraw the wordmark in another font.
- **Wordmark:** "Kinshasa Label" set in **Outfit ExtraBold (800)**, tight letter-spacing, with "Kinshasa" in ink `#0B2545` and "Label" in red `#D21C2E`. On dark backgrounds: white + yellow `#FCD933`. The signature « Vis Kin autrement » is set in capitals, Outfit Bold, wide letter-spacing, in blue `#1A82F5`.

## 2. Colours

### Core: the three logo colours (Congo flag)

| Name | Hex | Where it's used |
|---|---|---|
| Blue | `#1A82F5` | Logo wheel and tower, links, blue buttons, flag strip, browser theme colour |
| Blue deep | `#0E5FC9` | Blue text on white, gradient ends, hover |
| Blue soft | `#E6F1FF` | Blue chips and light panels |
| Navy | `#0A2A66` | Deep hero gradients, Kin Sécurité |
| Red | `#D21C2E` | Logo "K", **main call-to-action buttons**, the word "Label", live dot, Kin Food |
| Red dark | `#A60E1D` | Red hover, Kin Actualité header |
| Red soft | `#FDE8EA` | Red chips |
| Yellow | `#FCD933` | Logo sun-pin and gondolas, highlights in heroes, flag strip |
| Yellow deep | `#B98A00` | Yellow-family text on white (readable), Kin Culture |
| Yellow soft | `#FFF7D1` | Light yellow panels |

### Neutrals

| Name | Hex | Where it's used |
|---|---|---|
| Background | `#F5F8FE` | Page background |
| Surface | `#FFFFFF` | Cards, header, footer |
| Line | `#DCE5F3` | Borders, dividers |
| Ink | `#0B2545` | Main text, dark backgrounds |
| Muted | `#5E6E86` | Secondary text |

### Category colours (one per "Kin" rubrique)

| Rubrique | Colour | Soft | Tile gradient |
|---|---|---|---|
| Kin Actualité | `#D21C2E` | `#FDE8EA` | `#0A2A66 → #1A82F5` |
| Kin Food | `#D21C2E` | `#FDE8EA` | `#FF6B5A → #D21C2E` |
| Kin Places | `#1A82F5` | `#E6F1FF` | `#4BA3F7 → #0E5FC9` |
| Kin Culture | `#B98A00` (map pin `#E5A800`) | `#FFF7D1` | `#FFE36B → #F5B400` |
| Kin Style | `#C2185B` | `#FCE4EF` | `#F06292 → #C2185B` |
| Kin Sécurité | `#0A2A66` | `#E3E9F5` | `#3B5BA9 → #0A2A66` |
| Kin Traffic | `#E8590C` | `#FFEADB` | `#FFA94D → #E8590C` |
| Kin Weekend | `#7B3FE4` | `#EFE6FD` | `#9D6BFF → #5B21B6` |

Traffic levels: heavy `#D21C2E` · moderate `#F5B400` · light `#22A45D`.

**Signature detail:** the three-colour flag strip (blue | yellow | red, equal thirds) runs along the top of the header and footer.

## 3. Typography

| Role | Font | Weights used |
|---|---|---|
| Headings, wordmark, buttons, numbers | **Outfit** (variable, self-hosted; files in `fonts/`, SIL Open Font License) | 600 SemiBold, 700 Bold, 800 ExtraBold |
| Body text | The device's system font (`system-ui`, San Francisco, Segoe UI, Roboto) | 400, 500, 600 |

Headings are tight (`tracking-tight`) and very bold. Labels and eyebrows are small capitals with wide letter-spacing.

## 4. Shape and motif

- **Rounded everything:** pills for chips and buttons, 24 px corners on cards, 28 px on heroes.
- Soft, navy-tinted shadows (`card`, `lift` in `tokens.json`).
- **The wheel:** the Ferris-wheel ring (`SpinningWheel` in `src/components/BrandMark.tsx`) is the brand motif. It's used as a slowly turning loader and as a large faded decoration in hero corners.
- **The "Kin" system:** every rubrique is named *Kin + one word* (Kin Food, Kin Places, Kin Culture, Kin Style, Kin Sécurité, Kin Traffic, Kin Actualité, Kin Weekend). New sections should follow the same pattern.

## 5. Voice and copy

- **Always "tu"**, everywhere, including partner and legal pages: « Tu connais Kin ? », « Deviens partenaire », « Reste informé ».
- **Joyful, proud and local:** Kinshasa is "Kin", people are "les Kinois", and a few words of Lingala are welcome (« Mbote ! »). The brand is warm, never institutional.
- **Short and concrete:** one idea per line, with verbs of action (« Explore Kin sur la carte », « Surprends-moi », « Propose un lieu »).
- **Honest:** traffic levels are labelled *indicatif*, Google ratings are labelled *Note Google*, and nothing empty is ever shown.

Reference copy from the site:

| Where | Copy |
|---|---|
| Signature | Vis Kin autrement |
| Hero | Le meilleur de Kinshasa, commune par commune. — Restos, sorties, culture et bons plans — notés par les Kinois, sur une carte interactive. |
| Description (footer, SEO) | Le guide joyeux de Kinshasa : bonnes adresses, sorties, culture et actualité de la ville — commune par commune, sur une carte interactive. |
| Communes | Chaque commune a son caractère. Laquelle est la tienne ? |
| Surprise | Tu ne sais pas où aller ? Laisse la grande roue choisir pour toi. |
| Newsletter | Le meilleur de Kin, chaque semaine. |
| Footer | Fait avec fierté à Kinshasa. |

## 6. Inconsistencies found (to decide; nothing was changed)

1. **Three or four yellows.** The logo and tokens use `#FCD933`, but tile gradients, traffic "moderate", the share image and the communes cards use `#F5B400`. The Kin Culture map pin uses `#E5A800` and the logo itself has `#F5C518`. **Suggestion:** keep `#FCD933` as brand yellow and `#F5B400` as its official "deep" partner, and replace `#E5A800`.
2. **Kin Culture has two colours:** `#B98A00` on chips and text, `#E5A800` on map pins.
3. **Reds vary slightly:** brand `#D21C2E`, the logo's gradient end `#C0162A`, light gradient starts `#F04A3A` and `#FF6B5A`. They're visually close, but a single official "light red" would be cleaner.
4. **Weekend purple isn't a brand colour:** `#7B3FE4` (plus `#9D6BFF` and `#5B21B6` in its gradient) is used only by Kin Weekend and isn't part of the flag palette. The same goes for Style pink `#C2185B` and Traffic orange `#E8590C`. That's fine for category coding, but they should be listed as official category colours (as above) and not reused elsewhere.
5. **"Danger" equals brand red.** Error messages and destructive buttons use the same red as the main buttons, which can confuse. **Suggestion:** a distinct error red, or keep red but always add an icon or text.
6. **No real dark-mode logo.** The kit's "on dark" files place the logo on a white disc, the same workaround the site uses. A reversed or one-colour (white) version from the designer is still missing.
7. **No official wordmark or lockup file existed.** "Kinshasa Label" was only live text in the code. The lockups in this kit were composed from the code's styling and should be approved by the client.
8. **The share image uses a generic font.** `src/app/opengraph-image.tsx` renders the title in the default sans font, not Outfit, and uses `#F5B400` dots.
9. **Body text uses the system font**, not a brand font. That's a deliberate speed choice; mentioned so designers don't hunt for one.
10. **Two logo drawings:** the detailed `logo.svg` and the simplified `icon.svg` differ on purpose (small sizes). Use the simplified one only under 64 px.
