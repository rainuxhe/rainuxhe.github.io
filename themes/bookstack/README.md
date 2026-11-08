# Bookstack

Bookstack is a local Hugo theme fork built for sites that host several independent documentation sets.

It is derived from [LotusDocs](https://github.com/colinwilson/lotusdocs), `release` branch at commit `3d1639d`. The original theme and this fork remain available under the MIT License; the upstream copyright notice is retained in [`LICENSE`](LICENSE).

Bookstack adds an explicit multi-document registry and uses `docId` to scope navigation and search. Branding, typography, search indexing, syntax highlighting, and landing-page composition differ from upstream LotusDocs.

## Multi-document contract

Documents are declared in the site configuration:

```yaml
params:
  documents:
    - id: fastapi
      title: FastAPI
      path: /docs/fastapi/
      description: FastAPI notes
      icon: bolt
      weight: 10
```

Each document lives under `content/docs/<id>/`. Its `_index.md` sets the document ID on itself and cascades it to child pages:

```yaml
params:
  docId: fastapi
cascade:
  params:
    docId: fastapi
```

Bookstack uses `docId` to scope the sidebar, breadcrumbs, previous/next navigation, and search result labels. The document switcher links to each configured document's `_index` page.

## Development

The theme requires Hugo Extended 0.169.0 or newer, Dart Sass, and the Bootstrap SCSS Hugo module used by LotusDocs.
