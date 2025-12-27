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

import { createCache, mergeArrays, fetchReleases } from '../utils.ts'
import type { GithubReleasesOptions, GithubReleaseWithRepo, LoaderContract } from '../types.ts'

/**
 * A loader that fetches GitHub releases from an organization's repositories.
 * Supports caching, automatic refresh based on a schedule, and merging with existing data.
 *
 * @example
 * ```ts
 * const loader = new GithubReleasesLoader({
 *   org: 'adonisjs',
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/releases.json',
 *   refresh: 'daily',
 *   filters: {
 *     nameDoesntInclude: ['alpha', 'beta']
 *   }
 * })
 * ```
 */
export class GithubReleasesLoader<Schema extends SchemaTypes> implements LoaderContract<Schema> {
  /** Configuration options for the GitHub release loader */
  #options: GithubReleasesOptions

  /** Cache instance for storing and retrieving releases data */
  #cache: ReturnType<typeof createCache<GithubReleaseWithRepo[]>>

  /**
   * Creates a new GitHub release loader instance.
   *
   * @param options - Configuration options for loading GitHub releases
   *
   * @example
   * ```ts
   * const loader = new GithubReleasesLoader({
   *   org: 'adonisjs',
   *   ghToken: process.env.GITHUB_TOKEN,
   *   outputPath: './cache/releases.json',
   *   refresh: 'weekly'
   * })
   * ```
   */
  constructor(options: GithubReleasesOptions) {
    this.#options = options
    this.#cache = createCache<GithubReleaseWithRepo[]>({
      key: 'releases',
      outputPath: options.outputPath,
      refresh: options.refresh,
    })
  }

  /**
   * Loads and validates GitHub releases data.
   * Uses cached data if available and not expired, otherwise fetches fresh data
   * from GitHub API and merges with existing releases.
   *
   * @param schema - VineJS schema to validate the releases data against
   * @param metadata - Optional metadata to pass to the validator
   *
   * @example
   * ```ts
   * const releases = await loader.load(releasesSchema)
   * ```
   */
  async load(schema: Schema, metadata?: any) {
    let cachedReleases = await this.#cache.get()
    if (!cachedReleases) {
      const freshReleases = await fetchReleases(this.#options)
      const mergedReleases = cachedReleases
        ? mergeArrays(cachedReleases, freshReleases, 'url')
        : freshReleases
      cachedReleases = await this.#cache.put(mergedReleases)
    }

    return vine.validate({
      schema,
      data: cachedReleases,
      meta: metadata,
    })
  }
}
