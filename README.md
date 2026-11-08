# Bookstack

Bookstack is a multi-document Hugo site published at <https://gh.heruos.top/>. It currently contains FastAPI and PostgreSQL documentation examples.

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
