/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine from '@vinejs/vine'
import { type SchemaTypes } from '@vinejs/vine/types'

import { createCache, fetchContributorsForOrg } from '../utils.ts'
import type { GithubContributorNode, GithubContributorsOptions, LoaderContract } from '../types.ts'

/**
 * Default VineJS schema for the data returned by {@link GithubContributorsLoader}.
 * Matches the {@link GithubContributorNode} shape and is safe to plug into a
 * Collection without writing a schema by hand.
 */
export const ghContributorsSchema = vine.array(
  vine.object({
    login: vine.string(),
    id: vine.number().optional(),
    avatar_url: vine.string().nullable().optional(),
    html_url: vine.string().nullable().optional(),
    contributions: vine.number(),
  })
)

/**
 * A loader that fetches GitHub contributors from all repositories in an organization.
 * Supports caching and automatic refresh based on a schedule.
 *
 * @example
 * ```ts
 * const loader = new GithubContributorsLoader({
 *   org: 'adonisjs',
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/contributors.json',
 *   refresh: 'weekly'
 * })
 * ```
 */
export class GithubContributorsLoader<
  Schema extends SchemaTypes,
> implements LoaderContract<Schema> {
  /** Configuration options for the GitHub contributors loader */
  #options: GithubContributorsOptions

  /** Cache instance for storing and retrieving contributors data */
  #cache: ReturnType<typeof createCache<GithubContributorNode[]>>

  /**
   * Creates a new GitHub contributors loader instance.
   *
   * @param options - Configuration options for loading GitHub contributors
   *
   * @example
   * ```ts
   * const loader = new GithubContributorsLoader({
   *   org: 'adonisjs',
   *   ghToken: process.env.GITHUB_TOKEN,
   *   outputPath: './cache/contributors.json',
   *   refresh: 'weekly'
   * })
   * ```
   */
  constructor(options: GithubContributorsOptions) {
    this.#options = options
    this.#cache = createCache<GithubContributorNode[]>({
      key: 'contributors',
      outputPath: options.outputPath,
      refresh: options.refresh,
    })
  }

  /**
   * Loads and validates GitHub contributors data.
   * Uses cached data if available and not expired, otherwise fetches fresh data
   * from GitHub API and updates the cache.
   *
   * @param schema - VineJS schema to validate the contributors data against
   * @param metadata - Optional metadata to pass to the validator
   *
   * @example
   * ```ts
   * const contributors = await loader.load(contributorsSchema)
   * ```
   */
  async load(schema: Schema, metadata?: any) {
    let contributors = await this.#cache.get()
    if (!contributors) {
      contributors = await fetchContributorsForOrg(this.#options)
      await this.#cache.put(contributors)
    }

    return vine.validate({
      schema,
      data: contributors,
      meta: metadata,
    })
  }
}
