# Bookstack

Bookstack is a multi-document Hugo site published at <https://gh.heruos.top/>. It contains BookStack usage notes, the Chinese A2A protocol documentation, and Chinese translations of Google's Agent Development Kit (ADK) documentation.

## Prerequisites

- Hugo Extended 0.169.0 or newer
- Go 1.21 or newer for Hugo Modules
- Dart Sass 1.63.0 or newer, available as `sass` in `PATH`

The theme compiles Bootstrap SCSS with Hugo's `dartsass` transpiler, so installing Hugo Extended alone is not sufficient. Verify Dart Sass with:

```shell
sass --version
```

## Local development

```shell
hugo mod download
hugo server
```

Production build:

```shell
hugo --gc --minify
```

## Add a document

1. Create `content/docs/<id>/_index.md`.
2. Set its own `params.docId` and cascade the same value to descendants.
3. Add the matching entry under `params.documents` in `hugo.yml`.

```yaml
params:
  docId: example
cascade:
  params:
    docId: example
```

```yaml
params:
  documents:
    - id: example
      title: Example
      path: /docs/example/
      description: Example documentation
      icon: article
      weight: 30
```

The sidebar, breadcrumbs, previous/next links, document switcher, and search labels all use `docId`. The build fails when a configured document path does not resolve or a documentation page references an unknown document.

The local `themes/bookstack` theme is derived from LotusDocs; see its `FORK.md` and upstream MIT license.
