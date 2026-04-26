/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Infer, type SchemaTypes } from '@vinejs/vine/types'

/**
 * Contract for loading and validating content data using a VineJS schema.
 *
 * @example
 * ```ts
 * const loader: LoaderContract<typeof mySchema> = {
 *   async load(schema) {
 *     const data = await fetchData()
 *     return vine.validate({ schema, data })
 *   }
 * }
 * ```
 */
export interface LoaderContract<Schema extends SchemaTypes> {
  /**
   * Loads and validates data against the provided schema.
   *
   * @param schema - VineJS schema to validate the loaded data against
   */
  load(schema: Schema, validatorMetaData?: any): Promise<Infer<Schema>>
}

/**
 * A function type that transforms or queries collection data.
 *
 * @example
 * ```ts
 * const filterByStatus: ViewFn<typeof schema, [string], Item[]> = (data, status) => {
 *   return data.filter(item => item.status === status)
 * }
 * ```
 */
export type ViewFn<Schema extends SchemaTypes, Args extends any[], Result> = (
  input: Infer<Schema>,
  ...args: Args
) => Result

/**
 * Transforms a record of view functions into query method signatures.
 * Extracts the arguments and return type from each ViewFn to create method signatures.
 *
 * @example
 * ```ts
 * type Views = {
 *   filterByStatus: ViewFn<typeof schema, [string], Item[]>
 *   findById: ViewFn<typeof schema, [number], Item | undefined>
 * }
 *
 * type Methods = ViewsToQueryMethods<Views>
 * // Results in:
 * // {
 * //   filterByStatus: (status: string) => Item[]
 * //   findById: (id: number) => Item | undefined
 * // }
 * ```
 */
export type ViewsToQueryMethods<Views> = {
  [K in keyof Views]: Views[K] extends ViewFn<any, infer Args, infer Result>
    ? (...args: Args) => Result
    : never
}

/**
 * Configuration options for creating a Collection instance.
 *
 * @example
 * ```ts
 * const options: CollectionOptions<typeof postsSchema, typeof postViews> = {
 *   schema: postsSchema,
 *   loader: fileLoader,
 *   cache: true,
 *   views: {
 *     published: (posts) => posts.filter(p => p.published),
 *     findBySlug: (posts, slug) => posts.find(p => p.slug === slug)
 *   }
 * }
 * ```
 */
export type CollectionOptions<
  Schema extends SchemaTypes,
  Views extends {
    [name: string]: ViewFn<NoInfer<Schema>, any, any>
  },
> = {
  validatorMetaData?: any
  /** VineJS schema for validating loaded data */
  schema: Schema
  /** Loader implementation for fetching and validating data */
  loader: LoaderContract<NoInfer<Schema>>
  /** Whether to cache loaded data after first hydration */
  cache: boolean
  /** Optional view functions for querying/transforming the collection */
  views?: Views
}

/**
 * Configuration options for loading GitHub releases from an organization.
 *
 * @example
 * ```ts
 * const options: GithubReleasesOptions = {
 *   org: 'adonisjs',
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/releases.json',
 *   refresh: 'daily',
 *   filters: {
 *     nameDoesntInclude: ['alpha', 'beta']
 *   }
 * }
 * ```
 */
export type GithubReleasesOptions = {
  /** GitHub organization name */
  org: string
  /** GitHub personal access token for authentication */
  ghToken: string
  /** Path where cached data will be stored */
  outputPath: string
  /** How often to refresh the cached data */
  refresh: 'daily' | 'weekly' | 'monthly'
  /** Optional filters to include/exclude releases by name patterns */
  filters?: {
    /** Array of substrings that release names must contain */
    nameIncludes?: string[]
    /** Array of substrings that release names must not contain */
    nameDoesntInclude?: string[]
  }
}

/**
 * Represents a GitHub sponsor with their details and sponsorship information.
 *
 * @example
 * ```ts
 * const sponsor: GithubSponsor = {
 *   id: 'sp_123',
 *   createdAt: '2023-01-15T10:00:00Z',
 *   privacyLevel: 'PUBLIC',
 *   tierName: 'Gold Sponsor',
 *   tierMonthlyPriceInCents: 10000,
 *   sponsorType: 'User',
 *   sponsorLogin: 'johndoe',
 *   sponsorName: 'John Doe',
 *   sponsorAvatarUrl: 'https://avatars.githubusercontent.com/u/123',
 *   sponsorUrl: 'https://github.com/johndoe'
 * }
 * ```
 */
export type GithubSponsor = {
  /** Unique identifier for the sponsorship */
  id: string
  isActive: boolean
  /** ISO 8601 timestamp when the sponsorship was created */
  createdAt: string
  /** Privacy level of the sponsorship (PUBLIC, PRIVATE, etc.) */
  privacyLevel: string | null
  /** Name of the sponsorship tier */
  tierName: string | null
  /** Monthly price of the tier in cents */
  tierMonthlyPriceInCents: number | null
  /** Type of sponsor entity: "User" or "Organization" */
  sponsorType: string // "User" | "Organization"
  /** GitHub username of the sponsor */
  sponsorLogin: string
  /** Display name of the sponsor */
  sponsorName?: string | null
  /** Avatar URL of the sponsor */
  sponsorAvatarUrl?: string | null
  /** Profile URL of the sponsor */
  sponsorUrl?: string | null
}

/**
 * Configuration options for loading GitHub sponsors for a user or organization.
 *
 * @example
 * ```ts
 * const options: GithubSponsorsOptions = {
 *   login: 'adonisjs',
 *   isOrg: true,
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/sponsors.json',
 *   refresh: 'daily'
 * }
 * ```
 */
export type GithubSponsorsOptions = {
  /** GitHub username or organization name */
  login: string
  includeInactive?: boolean
  /** Whether the login is an organization (true) or user (false) */
  isOrg: boolean
  /** GitHub personal access token for authentication */
  ghToken: string
  /** Path where cached sponsors will be stored */
  outputPath: string
  /** How often to refresh the cached data */
  refresh: 'daily' | 'weekly' | 'monthly'
}

/**
 * Represents a GitHub release with its metadata.
 *
 * @example
 * ```ts
 * const release: GithubRelease = {
 *   name: 'v5.0.0',
 *   tagName: 'v5.0.0',
 *   publishedAt: '2023-12-01T10:00:00Z',
 *   url: 'https://github.com/adonisjs/core/releases/tag/v5.0.0',
 *   description: 'Major release with breaking changes'
 * }
 * ```
 */
export type GithubRelease = {
  /** Name of the release */
  name: string
  /** Git tag name associated with the release */
  tagName: string
  /** ISO 8601 timestamp when the release was published */
  publishedAt: string
  /** URL to the release page on GitHub */
  url: string
  /** Markdown description/notes for the release */
  description: string | null
}

/**
 * GitHub release with repository information.
 * Extends GithubRelease to include the repository name.
 *
 * @example
 * ```ts
 * const release: GithubReleaseWithRepo = {
 *   repo: 'core',
 *   name: 'v5.0.0',
 *   tagName: 'v5.0.0',
 *   publishedAt: '2023-12-01T10:00:00Z',
 *   url: 'https://github.com/adonisjs/core/releases/tag/v5.0.0',
 *   description: 'Major release with breaking changes'
 * }
 * ```
 */
export type GithubReleaseWithRepo = GithubRelease & {
  /** Name of the repository this release belongs to */
  repo: string
}

/**
 * Configuration options for loading GitHub contributors from an organization.
 *
 * @example
 * ```ts
 * const options: GithubContributorsOptions = {
 *   org: 'adonisjs',
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/contributors.json',
 *   refresh: 'weekly'
 * }
 * ```
 */
export type GithubContributorsOptions = {
  /** GitHub organization name */
  org: string
  /** GitHub personal access token for authentication */
  ghToken: string
  /** Path where cached contributors will be stored */
  outputPath: string
  /** How often to refresh the cached data */
  refresh: 'daily' | 'weekly' | 'monthly'
}

/**
 * Configuration options for loading and caching open source statistics from multiple sources.
 * Supports aggregating data from GitHub organizations and npm package downloads.
 *
 * @example
 * ```ts
 * const options: OssStatsOptions = {
 *   outputPath: './cache/oss-stats.json',
 *   refresh: 'daily',
 *   sources: [
 *     {
 *       type: 'github',
 *       org: 'adonisjs',
 *       ghToken: process.env.GITHUB_TOKEN
 *     },
 *     {
 *       type: 'npm',
 *       packages: [
 *         { name: '@adonisjs/core', startDate: '2020-01-01' },
 *         { name: '@adonisjs/lucid', startDate: '2020-01-01' }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type OssStatsOptions = {
  /** Path where cached stats will be stored */
  outputPath: string
  /** How often to refresh the cached data */
  refresh: 'daily' | 'weekly' | 'monthly'
  /** Array of data sources to aggregate statistics from */
  sources: (
    | {
        /** Source type: GitHub organization statistics */
        type: 'github'
        /** GitHub organization name */
        org: string
        /** GitHub personal access token for authentication */
        ghToken: string
      }
    | {
        /** Source type: npm package download statistics */
        type: 'npm'
        /** Array of npm packages with their tracking start dates */
        packages: { name: string; startDate: string }[]
      }
    | (() => Promise<{
        key: string
        count: number
      }>)
  )[]
}

/**
 * Type representing the aggregated open source statistics
 */
export type OssStats = {
  /** Total GitHub stars across all sources */
  stars: number
  /** Total npm package downloads across all sources */
  installs: number
} & Record<string, number>

/**
 * Represents a GitHub contributor with their profile information and contribution count.
 * This matches the shape returned by GitHub REST API /contributors endpoint.
 *
 * @example
 * ```ts
 * const contributor: GithubContributorNode = {
 *   login: 'thetutlage',
 *   id: 103858,
 *   avatar_url: 'https://avatars.githubusercontent.com/u/103858',
 *   html_url: 'https://github.com/thetutlage',
 *   contributions: 250
 * }
 * ```
 */
export type GithubContributorNode = {
  /** GitHub username of the contributor */
  login: string
  /** Unique GitHub user ID */
  id?: number
  /** Avatar URL of the contributor */
  avatar_url?: string | null
  /** Profile URL of the contributor */
  html_url?: string | null
  /** Number of contributions made to the repository */
  contributions: number
}

/**
 * Represents a person assigned to a GitHub Projects v2 card.
 */
export type GithubProjectAssignee = {
  /** GitHub username */
  login: string
  /** Display name */
  name: string | null
  /** Avatar URL */
  avatarUrl: string | null
  /** Profile URL */
  url: string | null
}

/**
 * Represents a single card from a GitHub Projects v2 board. The card may be backed
 * by an Issue, Pull Request, or Draft Issue. Well-known fields are extracted directly,
 * while any extra single-select / number / text / date / iteration field is exposed
 * via `customFields`.
 *
 * @example
 * ```ts
 * const card: GithubProjectCard = {
 *   id: 'PVTI_lADO...',
 *   type: 'ISSUE',
 *   title: 'Add OAuth provider',
 *   url: 'https://github.com/adonisjs/core/issues/123',
 *   number: 123,
 *   state: 'OPEN',
 *   status: 'In Progress',
 *   priority: 'P1',
 *   effort: 3,
 *   labels: ['enhancement'],
 *   assignees: [{ login: 'thetutlage', name: 'Harminder', avatarUrl: '...', url: '...' }],
 *   description: '## Goal\n\nWe want to ...',
 *   summary: 'We want to ...',
 *   customFields: { 'Target release': '1.6.0' }
 * }
 * ```
 */
export type GithubProjectCard = {
  /** Project item node ID (e.g. "PVTI_lADO...") */
  id: string
  /**
   * Project item integer database ID. Use this to deep-link into the project
   * board for any card (including draft issues), e.g.
   * `https://github.com/orgs/<login>/projects/<projectNumber>?pane=issue&itemId=<databaseId>`.
   */
  databaseId: number | null
  /** Underlying content type for the card */
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE'
  /** Card title */
  title: string
  /** URL to the underlying issue or PR (null for draft issues) */
  url: string | null
  /** Issue or PR number (null for draft issues) */
  number: number | null
  /** Underlying issue/PR state, e.g. OPEN, CLOSED, MERGED */
  state: string | null
  /** Value of the board's Status column, e.g. "Backlog", "In Progress" */
  status: string | null
  /** Value of a single-select field named "Priority" (case-insensitive) */
  priority: string | null
  /** Value of a number field named "Effort" or "Estimate" (case-insensitive) */
  effort: number | null
  /** Labels attached to the underlying issue or PR */
  labels: string[]
  /** People assigned to the card */
  assignees: GithubProjectAssignee[]
  /** Full markdown body of the underlying content */
  description: string | null
  /** Short summary derived from `description` */
  summary: string | null
  /** Any project field not covered by the well-known fields above */
  customFields: Record<string, string | number | null>
}

/**
 * Configuration options for loading a GitHub Projects v2 (kanban) board.
 *
 * @example
 * ```ts
 * const options: GithubProjectOptions = {
 *   login: 'adonisjs',
 *   isOrg: true,
 *   projectNumber: 5,
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/board.json',
 *   refresh: 'daily',
 *   skipStatuses: ['Backlog', 'Done'],
 *   summary: (description) => description.split('\n')[0]
 * }
 * ```
 */
/**
 * GraphQL response shape for an assignee node returned by the Projects v2 API.
 */
export type GithubProjectAssigneeNode = {
  login: string
  name?: string | null
  avatarUrl?: string | null
  url?: string | null
}

/**
 * GraphQL response shape shared by Issue, PullRequest, and DraftIssue content
 * referenced from a Projects v2 item.
 */
export type GithubProjectContentBase = {
  title: string
  body: string | null
  assignees: { nodes: GithubProjectAssigneeNode[] }
}

/**
 * GraphQL response shape for Issue or PullRequest content on a Projects v2 item.
 */
export type GithubProjectIssueOrPRContent = GithubProjectContentBase & {
  url: string
  number: number
  state: string
  labels: { nodes: { name: string }[] }
}

/**
 * GraphQL response shape for DraftIssue content on a Projects v2 item.
 */
export type GithubProjectDraftIssueContent = GithubProjectContentBase

/**
 * GraphQL response shape for a single field value attached to a Projects v2 item.
 * Discriminated by `__typename`; a fallback variant covers field types we do not
 * explicitly handle.
 */
export type GithubProjectFieldValueNode =
  | {
      __typename: 'ProjectV2ItemFieldSingleSelectValue'
      name: string | null
      field: { name: string }
    }
  | {
      __typename: 'ProjectV2ItemFieldNumberValue'
      number: number | null
      field: { name: string }
    }
  | { __typename: 'ProjectV2ItemFieldTextValue'; text: string | null; field: { name: string } }
  | { __typename: 'ProjectV2ItemFieldDateValue'; date: string | null; field: { name: string } }
  | {
      __typename: 'ProjectV2ItemFieldIterationValue'
      title: string | null
      field: { name: string }
    }
  | { __typename: string }

/**
 * GraphQL response shape for a single Projects v2 item, including its content
 * and field values.
 */
export type GithubProjectItemNode = {
  id: string
  databaseId: number | null
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE' | 'REDACTED'
  content:
    | ({ __typename: 'Issue' | 'PullRequest' } & GithubProjectIssueOrPRContent)
    | ({ __typename: 'DraftIssue' } & GithubProjectDraftIssueContent)
    | null
  fieldValues: { nodes: GithubProjectFieldValueNode[] }
}

/**
 * GraphQL response shape for a paginated `items` connection on a Projects v2.
 */
export type GithubProjectItemsConnection = {
  nodes: GithubProjectItemNode[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

/**
 * GraphQL response shape for the top-level Projects v2 query, covering both the
 * organization and user roots.
 */
export type GithubProjectQueryResponse = {
  organization?: { projectV2: { items: GithubProjectItemsConnection } | null }
  user?: { projectV2: { items: GithubProjectItemsConnection } | null }
}

export type GithubProjectOptions = {
  /** GitHub username or organization that owns the project */
  login: string
  /** Whether `login` refers to an organization (true) or a user (false) */
  isOrg: boolean
  /** Project number as it appears in the project URL */
  projectNumber: number
  /** GitHub personal access token with `read:project` scope */
  ghToken: string
  /** Path where cached cards will be stored */
  outputPath: string
  /** How often to refresh the cached data */
  refresh: 'daily' | 'weekly' | 'monthly'
  /**
   * Status column values to skip. Cards whose Status field matches any value
   * in this list (case-insensitive) are excluded from the result.
   */
  skipStatuses?: string[]
  /**
   * Strategy for deriving `card.summary` from `card.description`.
   * Defaults to the first paragraph of the markdown body.
   */
  summary?: (description: string) => string
}
