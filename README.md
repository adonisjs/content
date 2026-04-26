# @adonisjs/content

<br />

[![gh-workflow-image]][gh-workflow-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

## Introduction

A type-safe content management package for AdonisJS that enables you to create validated collections with schema validation and use loaders to load data.

The main goal of this package is to load data from JSON files and remote sources for creating documentation websites or blogs.

We use this package for all official AdonisJS websites to manage docs, blog posts, GitHub sponsors data, GitHub releases, project boards, and so on.

**Key Features:**

- **Type-safe collections** with VineJS schema validation
- **GitHub loaders** for sponsors, releases, contributors, project boards, and aggregated OSS statistics
- **Default schemas** shipped with every loader so you can drop one into a Collection without authoring a schema
- **npm package statistics** aggregation with download counts
- **Custom query methods** for filtering and transforming data
- **JSON file loading** with validation
- **Vite integration** for asset path resolution

## Installation

Install the package from npm registry as follows:

```sh
npm i @adonisjs/content
```

```sh
yarn add @adonisjs/content
```

```sh
pnpm add @adonisjs/content
```

## Configuration

The package requires `@adonisjs/core`, `@adonisjs/vite`, and `@vinejs/vine` as peer dependencies. Run the following command to register the `@adonisjs/content/content_provider` to the `adonisrc.ts` file.

```sh
node ace configure @adonisjs/content
```

## Usage

### Creating a Collection

Collections are the core building blocks for managing typed content. Create one by providing a VineJS schema and a loader:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

const postSchema = vine.object({
  title: vine.string(),
  slug: vine.string(),
  content: vine.string(),
  published: vine.boolean(),
})

const posts = new Collection({
  schema: vine.array(postSchema),
  loader: loaders.jsonLoader(app.makePath('data/posts.json')),
  cache: true,
  views: {
    published: (posts) => posts.filter((p) => p.published),
    findBySlug: (posts, slug: string) => posts.find((p) => p.slug === slug),
  },
})

const query = await posts.load()
const allPosts = query.all()
const publishedPosts = query.published()
const post = query.findBySlug('hello-world')
```

### Default Schemas

Each built-in loader ships a default VineJS schema that mirrors its return shape. Use `schemas.<loader>` whenever the default shape is enough — you only need to write a custom schema if you want to narrow or extend the validation.

```ts
import { Collection } from '@adonisjs/content'
import { loaders, schemas } from '@adonisjs/content/loaders'

const sponsors = new Collection({
  schema: schemas.ghSponsors,
  loader: loaders.ghSponsors({ ... }),
  cache: true,
})
```

The `schemas` namespace exposes:

| Key             | Validates                                                |
| --------------- | -------------------------------------------------------- |
| `ghSponsors`    | Array of sponsors fetched by the sponsors loader         |
| `ghContributors`| Array of contributors fetched by the contributors loader |
| `ghReleases`    | Array of releases fetched by the releases loader         |
| `ghProject`     | Array of project cards fetched by the project loader     |
| `ossStats`      | Aggregated OSS stats object (`stars`, `installs`)        |

### GitHub Sponsors Loader

Fetch and cache GitHub sponsors data:

```ts
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders, schemas } from '@adonisjs/content/loaders'

const sponsors = new Collection({
  schema: schemas.ghSponsors,
  loader: loaders.ghSponsors({
    login: 'adonisjs',
    isOrg: true,
    ghToken: process.env.GITHUB_TOKEN!,
    outputPath: app.makePath('cache/sponsors.json'),
    refresh: 'daily',
    includeInactive: false,
  }),
  cache: true,
})

const query = await sponsors.load()
const allSponsors = query.all()
```

**Options**

| Option            | Type                                | Description                                                                |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `login`           | `string`                            | Username or organization name.                                             |
| `isOrg`           | `boolean`                           | `true` if `login` is an organization, `false` for a user.                  |
| `ghToken`         | `string`                            | GitHub personal access token.                                              |
| `outputPath`      | `string`                            | File path where cached sponsors are stored.                                |
| `refresh`         | `'daily' \| 'weekly' \| 'monthly'`  | Cache refresh interval.                                                    |
| `includeInactive` | `boolean` *(optional)*              | Include cancelled sponsorships. Defaults to `false`.                       |

### GitHub Releases Loader

Fetch releases from all public repositories in an organization:

```ts
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders, schemas } from '@adonisjs/content/loaders'

const releases = new Collection({
  schema: schemas.ghReleases,
  loader: loaders.ghReleases({
    org: 'adonisjs',
    ghToken: process.env.GITHUB_TOKEN!,
    outputPath: app.makePath('cache/releases.json'),
    refresh: 'daily',
    filters: {
      nameDoesntInclude: ['alpha', 'beta', 'rc'],
      nameIncludes: ['adonis'],
    },
  }),
  cache: true,
  views: {
    latest: (releases) => releases.slice(0, 5),
    byRepo: (releases, repo: string) => releases.filter((r) => r.repo === repo),
  },
})
```

**Options**

| Option                       | Type                                | Description                                                          |
| ---------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `org`                        | `string`                            | Organization name.                                                   |
| `ghToken`                    | `string`                            | GitHub personal access token.                                        |
| `outputPath`                 | `string`                            | File path where cached releases are stored.                          |
| `refresh`                    | `'daily' \| 'weekly' \| 'monthly'`  | Cache refresh interval.                                              |
| `filters.nameIncludes`       | `string[]` *(optional)*             | Only include releases whose name contains one of these substrings.   |
| `filters.nameDoesntInclude`  | `string[]` *(optional)*             | Exclude releases whose name contains one of these substrings.        |

The releases loader **merges** newly fetched releases with the cached ones (deduplicated by `url`), so historical releases are retained even after they fall out of GitHub's recent window.

### GitHub Contributors Loader

Aggregate contributors from all public repositories of an organization:

```ts
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders, schemas } from '@adonisjs/content/loaders'

const contributors = new Collection({
  schema: schemas.ghContributors,
  loader: loaders.ghContributors({
    org: 'adonisjs',
    ghToken: process.env.GITHUB_TOKEN!,
    outputPath: app.makePath('cache/contributors.json'),
    refresh: 'weekly',
  }),
  cache: true,
  views: {
    top: (contributors, limit: number = 10) =>
      contributors.sort((a, b) => b.contributions - a.contributions).slice(0, limit),
  },
})
```

**Options**

| Option       | Type                                | Description                                  |
| ------------ | ----------------------------------- | -------------------------------------------- |
| `org`        | `string`                            | Organization name.                           |
| `ghToken`    | `string`                            | GitHub personal access token.                |
| `outputPath` | `string`                            | File path where cached contributors live.    |
| `refresh`    | `'daily' \| 'weekly' \| 'monthly'`  | Cache refresh interval.                      |

### GitHub Project Loader

Fetch cards from a GitHub Projects v2 (kanban) board, including issues, pull requests, and draft issues. Status, priority, effort, labels, and assignees are extracted directly; any other project field is exposed via `customFields`.

```ts
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders, schemas } from '@adonisjs/content/loaders'

const board = new Collection({
  schema: schemas.ghProject,
  loader: loaders.ghProject({
    login: 'adonisjs',
    isOrg: true,
    projectNumber: 8,
    ghToken: process.env.GITHUB_TOKEN!,
    outputPath: app.makePath('cache/board.json'),
    refresh: 'daily',
    skipStatuses: ['Backlog', 'Done'],
    summary: (description) => description.split('<!--more-->')[0],
  }),
  cache: true,
  views: {
    inProgress: (cards) => cards.filter((c) => c.status === 'In Progress'),
    byAssignee: (cards, login: string) =>
      cards.filter((c) => c.assignees.some((a) => a.login === login)),
  },
})
```

> **Note**: The token must include the `read:project` scope.

**Options**

| Option          | Type                                  | Description                                                                                                |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `login`         | `string`                              | Username or organization that owns the project.                                                            |
| `isOrg`         | `boolean`                             | `true` if `login` is an organization, `false` for a user.                                                  |
| `projectNumber` | `number`                              | Project number as it appears in the project URL.                                                           |
| `ghToken`       | `string`                              | GitHub personal access token with `read:project` scope.                                                    |
| `outputPath`    | `string`                              | File path where cached cards are stored.                                                                   |
| `refresh`       | `'daily' \| 'weekly' \| 'monthly'`    | Cache refresh interval.                                                                                    |
| `skipStatuses`  | `string[]` *(optional)*               | Skip cards whose Status field equals any value in this list (case-insensitive).                            |
| `summary`       | `(description: string) => string` *(optional)* | Strategy for deriving `card.summary` from `card.description`. Defaults to the first paragraph of the markdown body. |

Each card resolves to:

```ts
{
  id: string
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE'
  title: string
  url: string | null
  number: number | null
  state: string | null              // e.g. 'OPEN', 'CLOSED', 'MERGED'
  status: string | null             // e.g. 'In Progress'
  priority: string | null           // value of single-select field "Priority"
  effort: number | null             // value of number field "Effort" or "Estimate"
  labels: string[]
  assignees: { login, name, avatarUrl, url }[]
  description: string | null
  summary: string | null
  customFields: Record<string, string | number | null>
}
```

### OSS Stats Loader

Aggregate open source statistics from multiple sources including GitHub stars and npm package downloads:

```ts
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders, schemas } from '@adonisjs/content/loaders'

const ossStats = new Collection({
  schema: schemas.ossStats,
  loader: loaders.ossStats({
    outputPath: app.makePath('cache/oss-stats.json'),
    refresh: 'daily',
    sources: [
      {
        type: 'github',
        org: 'adonisjs',
        ghToken: process.env.GITHUB_TOKEN!,
      },
      {
        type: 'npm',
        packages: [
          { name: '@adonisjs/core', startDate: '2020-01-01' },
          { name: '@adonisjs/lucid', startDate: '2020-01-01' },
        ],
      },
      // Custom source: any async function returning { key, count }
      async () => ({ key: 'discordMembers', count: await fetchDiscordMembers() }),
    ],
  }),
  cache: true,
})

const query = await ossStats.load()
const stats = query.all()
console.log(`Total GitHub stars: ${stats.stars}`)
console.log(`Total npm downloads: ${stats.installs}`)
```

**Source types**

- `{ type: 'github', org, ghToken }` — sums non-archived public repo stars under `stars`.
- `{ type: 'npm', packages: [{ name, startDate }] }` — sums npm download counts under `installs`.
- `() => Promise<{ key: string, count: number }>` — any custom aggregator. Its `key` becomes a top-level field on the result.

The default `schemas.ossStats` only validates `stars` and `installs`. If you use custom function sources, define your own schema or extend the default to validate the additional keys.

### JSON Loader

Load and validate data from a local JSON file:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

const posts = new Collection({
  schema: vine.array(postSchema),
  loader: loaders.jsonLoader(app.makePath('data/posts.json')),
  cache: true,
})
```

### Custom Views

Views are reusable query methods attached to a collection. They are fully type-safe and receive the validated dataset as the first argument:

```ts
const posts = new Collection({
  schema: vine.array(postSchema),
  loader: loaders.jsonLoader(app.makePath('data/posts.json')),
  cache: true,
  views: {
    published: (posts) => posts.filter((p) => p.published),
    findBySlug: (posts, slug: string) => posts.find((p) => p.slug === slug),
    byYear: (posts) => {
      const grouped = new Map<number, typeof posts>()
      for (const post of posts) {
        const year = new Date(post.publishedAt).getFullYear()
        if (!grouped.has(year)) grouped.set(year, [])
        grouped.get(year)!.push(post)
      }
      return grouped
    },
  },
})

const query = await posts.load()
query.all()                 // full dataset
query.published()           // typed result of the view fn
query.findBySlug('my-post')
query.byYear()              // Map<number, Post[]>
```

### Multi-section Collections

Use `Collection.multi` to spin up a collection per section and load them together:

```ts
const docs = Collection.multi(['guides', 'api', 'tutorials'] as const, (section) =>
  new Collection({
    schema: vine.array(docSchema),
    loader: loaders.jsonLoader(app.makePath(`data/${section}.json`)),
    cache: true,
  })
)

// Each section is accessible as a Collection instance
docs.guides // Collection<...>

// Or load them all at once
const sections = await docs.load()
sections.guides.all()
sections.api.all()
sections.tutorials.all()
```

### Caching

Loaders persist their results to disk and reuse them until the configured refresh window elapses.

- `'daily'` — refreshes once per day
- `'weekly'` — refreshes once per week
- `'monthly'` — refreshes once per month

Cached data is stored as JSON with a `lastFetched` timestamp and the loader's payload under a loader-specific key, for example:

```json
{
  "lastFetched": "2024-01-15T10:30:00.000Z",
  "sponsors": [...]
}
```

`Collection`'s own `cache: true` flag is independent — it caches the *validated, view-bound* result in memory for the lifetime of the process so subsequent `load()` calls are free.

You can also reuse the disk-cache helper for your own data:

```ts
import { createCache } from '@adonisjs/content'

const cache = createCache<MyData>({
  key: 'myData',
  outputPath: app.makePath('cache/my-data.json'),
  refresh: 'daily',
})

let data = await cache.get()
if (!data) {
  data = await fetchFromSomewhere()
  await cache.put(data)
}
```

### Vite Integration

Use Vite asset paths in your content:

```ts
const schema = vine.object({
  title: vine.string(),
  image: vine.string().toVitePath(),
})

const posts = new Collection({
  schema: vine.array(schema),
  loader: loaders.jsonLoader(app.makePath('data/posts.json')),
  cache: true,
})
```

The `toVitePath()` macro converts relative paths to Vite asset paths automatically. The Vite instance is wired through the AdonisJS provider; if you instantiate Collections outside of an HTTP context, call `Collection.useVite(vite)` once during app boot.

### Custom Loaders

Implement the `LoaderContract` interface to plug any data source into a Collection:

```ts
import vine from '@vinejs/vine'
import { type SchemaTypes, type Infer } from '@vinejs/vine/types'
import { type LoaderContract } from '@adonisjs/content/types'

class RemoteApiLoader<Schema extends SchemaTypes> implements LoaderContract<Schema> {
  constructor(private endpoint: string) {}

  async load(schema: Schema, metadata?: any): Promise<Infer<Schema>> {
    const response = await fetch(this.endpoint)
    const data = await response.json()
    return vine.validate({ schema, data, meta: metadata })
  }
}
```

## API Reference

**Top-level (`@adonisjs/content`)**

- `Collection` — class with the following members:
  - `new Collection(options)` / `Collection.create(options)` — construct a collection
  - `Collection.multi(sections, factory)` — section-keyed collections plus a combined `.load()`
  - `Collection.useVite(vite)` — wire the Vite service for `toVitePath()` resolution
  - `Collection.useApp(app)` — wire the AdonisJS application instance for validator metadata
  - `collection.load()` — returns `{ all(), ...views }`
  - `collection.hydrate()` — lower-level: returns `{ data, views }`
- `configure` — the AdonisJS configure hook (used by `node ace configure`)
- `createCache` — disk-cache helper (`{ get, put }`) used internally by every remote loader

**`@adonisjs/content/loaders`**

- `loaders` — factory namespace: `ghSponsors`, `ghContributors`, `ghReleases`, `ghProject`, `ossStats`, `jsonLoader`
- `schemas` — default VineJS schema namespace: `ghSponsors`, `ghContributors`, `ghReleases`, `ghProject`, `ossStats`
- Loader classes (for advanced use or custom subclassing): `GithubSponsorsLoader`, `GithubContributorsLoader`, `GithubReleasesLoader`, `GithubProjectLoader`, `OssStatsLoader`, `JsonLoader`
- Per-loader schema constants: `ghSponsorsSchema`, `ghContributorsSchema`, `ghReleasesSchema`, `ghProjectSchema`, `ossStatsSchema`

**`@adonisjs/content/types`**

- `LoaderContract<Schema>` — interface to implement for custom loaders
- `CollectionOptions<Schema, Views>`, `ViewFn`, `ViewsToQueryMethods`
- Per-loader option/result types: `GithubSponsorsOptions`, `GithubSponsor`, `GithubReleasesOptions`, `GithubRelease`, `GithubReleaseWithRepo`, `GithubContributorsOptions`, `GithubContributorNode`, `GithubProjectOptions`, `GithubProjectCard`, `GithubProjectAssignee`, `OssStatsOptions`, `OssStats`

## Contributing

One of the primary goals of AdonisJS is to have a vibrant community of users and contributors who believes in the principles of the framework.

We encourage you to read the [contribution guide](https://github.com/adonisjs/.github/blob/main/docs/CONTRIBUTING.md) before contributing to the framework.

## Code of Conduct

In order to ensure that the AdonisJS community is welcoming to all, please review and abide by the [Code of Conduct](https://github.com/adonisjs/.github/blob/main/docs/CODE_OF_CONDUCT.md).

## License

@adonisjs/content is open-sourced software licensed under the [MIT license](LICENSE.md).

[gh-workflow-image]: https://img.shields.io/github/actions/workflow/status/adonisjs/content/checks.yml?style=for-the-badge
[gh-workflow-url]: https://github.com/adonisjs/content/actions/workflows/checks.yml 'Github action'
[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]: "typescript"
[npm-image]: https://img.shields.io/npm/v/@adonisjs/content.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/@adonisjs/content 'npm'
[license-image]: https://img.shields.io/npm/l/@adonisjs/content?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md 'license'
