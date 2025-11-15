# @adonisjs/content

<br />

[![gh-workflow-image]][gh-workflow-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

## Introduction

A type-safe content management package for AdonisJS that enables you to create validated collections with schema validation and use loaders to load data.

The main goal of this package is to use load data from JSON files for creating documentation websites or blog.

We use this package for all official AdonisJS websites to manage docs, blog posts, Github sponsors data, Github releases, and so on.

**Key Features:**

- **Type-safe collections** with VineJS schema validation
- **GitHub loaders** for sponsors, releases, and contributors
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

Collections are the core building blocks for managing typed content. Create a collection by providing a VineJS schema and a loader:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

// Define a schema
const postSchema = vine.object({
  title: vine.string(),
  slug: vine.string(),
  content: vine.string(),
  published: vine.boolean(),
})

// Create a collection with custom views
const posts = new Collection({
  schema: vine.array(postSchema),
  loader: loaders.jsonLoader(app.makePath('data/posts.json')),
  cache: true,
  views: {
    published: (posts) => posts.filter((p) => p.published),
    findBySlug: (posts, slug: string) => posts.find((p) => p.slug === slug),
  },
})

// Query the collection
const query = await posts.load()
const allPosts = query.all()
const publishedPosts = query.published()
const post = query.findBySlug('hello-world')
```

### GitHub Sponsors Loader

Fetch and cache GitHub sponsors data:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

const sponsorSchema = vine.object({
  id: vine.string(),
  sponsorLogin: vine.string(),
  sponsorName: vine.string().nullable().optional(),
  tierMonthlyPriceInCents: vine.number().nullable().optional(),
  // ... other fields
})

const sponsorsLoader = loaders.ghSponsors({
  login: 'adonisjs',
  isOrg: true,
  ghToken: process.env.GITHUB_TOKEN!,
  outputPath: app.makePath('cache/sponsors.json'),
  refresh: 'daily',
})

const sponsors = new Collection({
  schema: vine.array(sponsorSchema),
  loader: sponsorsLoader,
  cache: true,
})

const query = await sponsors.load()
const allSponsors = query.all()
```

### GitHub Releases Loader

Fetch releases from all public repositories in an organization:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

const releasesLoader = loaders.ghReleases({
  org: 'adonisjs',
  ghToken: process.env.GITHUB_TOKEN!,
  outputPath: app.makePath('cache/releases.json'),
  refresh: 'daily',
  filters: {
    nameDoesntInclude: ['alpha', 'beta', 'rc'],
    nameIncludes: ['adonis'],
  },
})

const releases = new Collection({
  schema: vine.array(releaseSchema),
  loader: releasesLoader,
  cache: true,
  views: {
    latest: (releases) => releases.slice(0, 5),
    byRepo: (releases, repo: string) => releases.filter((r) => r.repo === repo),
  },
})
```

### GitHub Contributors Loader

Aggregate contributors from all public repositories:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

const contributorsLoader = loaders.ghContributors({
  org: 'adonisjs',
  ghToken: process.env.GITHUB_TOKEN!,
  outputPath: app.makePath('cache/contributors.json'),
  refresh: 'weekly',
})

const contributors = new Collection({
  schema: vine.array(contributorSchema),
  loader: contributorsLoader,
  cache: true,
  views: {
    top: (contributors, limit: number = 10) =>
      contributors.sort((a, b) => b.contributions - a.contributions).slice(0, limit),
  },
})
```

### Custom Views

Views allow you to define reusable query methods with full type safety:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

const postSchema = vine.object({
  title: vine.string(),
  slug: vine.string(),
  published: vine.boolean(),
  publishedAt: vine.date(),
})

const posts = new Collection({
  schema: vine.array(postSchema),
  loader: loaders.jsonLoader(app.makePath('data/posts.json')),
  cache: true,
  views: {
    // Simple filter
    published: (posts) => posts.filter((p) => p.published),

    // With parameters
    findBySlug: (posts, slug: string) => posts.find((p) => p.slug === slug),

    // Complex transformations
    byYear: (posts) => {
      const grouped = new Map()
      for (const post of posts) {
        const year = new Date(post.publishedAt).getFullYear()
        if (!grouped.has(year)) grouped.set(year, [])
        grouped.get(year).push(post)
      }
      return grouped
    },
  },
})

const query = await posts.load()
query.published() // Type-safe!
query.findBySlug('my-post') // Type-safe!
query.byYear() // Returns Map<number, Post[]>
```

### Caching

Collections support intelligent caching with configurable refresh schedules:

- `'daily'`: Refreshes once per day
- `'weekly'`: Refreshes once per week
- `'monthly'`: Refreshes once per month

Cached data is stored as JSON with metadata:

```json
{
  "lastFetched": "2024-01-15T10:30:00.000Z",
  "data": [...]
}
```

### Vite Integration

Use Vite asset paths in your content:

```ts
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

const schema = vine.object({
  title: vine.string(),
  image: vine.string().toVitePath(), // Custom VineJS macro
})

const posts = new Collection({
  schema: vine.array(schema),
  loader: loaders.jsonLoader(app.makePath('data/posts.json')),
  cache: true,
})
```

The `toVitePath()` macro converts relative paths to Vite asset paths automatically.

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
