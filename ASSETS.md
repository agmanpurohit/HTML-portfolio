# Assets to replace

Every placeholder below is marked in the HTML with an uppercase comment, so you can
find all of them with a project-wide search for `<!-- PROFILE PHOTO -->` and friends.

## Images

| What | Current placeholder | Where | Marker |
|---|---|---|---|
| Profile photo — home hero | `https://placehold.co/800x1000/6D4AC4/F7F5FA?text=Agman+Rajpurohit` | `index.html` | `<!-- PROFILE PHOTO -->` |
| Profile photo — about | `https://placehold.co/900x1100/14111C/F7F5FA?text=Agman+Rajpurohit` | `about.html` | `<!-- PROFILE PHOTO -->` |
| Case study images (6) | `https://placehold.co/1200x800/EDE7FB/6D4AC4?text=Case+Study` | `index.html`, `work.html` | `<!-- CASE IMAGE -->` |
| Open Graph / Twitter card | `https://placehold.co/1200x630/14111C/F7F5FA?text=Agman+Rajpurohit` | all 7 pages, `<head>` | `<!-- OG IMAGE -->` |

Keep the aspect ratios. Every `<img>` already carries explicit `width` and `height`
attributes — **update those numbers if your replacement has different dimensions**,
otherwise you reintroduce layout shift and the CLS score drops.

Recommended real sizes: hero portrait 800×1000, about portrait 900×1100, case
images 1200×800, OG image exactly 1200×630.

## Files

| What | Path | Notes |
|---|---|---|
| Logo | `assets/img/logo.svg` | Also inlined in the header/footer of each page. Replace **both** — search `<!-- LOGO -->`. |
| CV | `assets/Agman-Rajpurohit-CV.pdf` | Currently a one-line placeholder PDF so the download link never 404s. |
| Favicon | inline SVG in `<head>` | Data-URI `AR` monogram. Replace with `<link rel="icon" href="/favicon.ico">` if you prefer. |

## Links and text

| What | Current | Where |
|---|---|---|
| LinkedIn URL | `href="#"` | Footer + contact page — `<!-- LINKEDIN -->` |
| Canonical domain | `https://agmanrajpurohit.com/` | `BASE` in `build.py`, plus `robots.txt` and `sitemap.xml` |
| Testimonials | three clearly-marked placeholders | `index.html` — `<!-- PLACEHOLDER TESTIMONIAL -->` |

**On the testimonials:** these are the only invented content on the site and they are
labelled as samples in the markup. Replace them with real, attributed quotes or delete
the section — do not ship invented praise.

## What is already real

All six case studies, every metric, the employment history, education and
certifications come from the supplied portfolio deck and CV. Nothing there is
placeholder. If a number changes, the source of truth is the deck.
