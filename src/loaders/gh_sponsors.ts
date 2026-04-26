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

import { createCache, fetchAllSponsors } from '../utils.ts'
import type { GithubSponsor, GithubSponsorsOptions, LoaderContract } from '../types.ts'

/**
 * Default VineJS schema for the data returned by {@link GithubSponsorsLoader}.
 * Matches the {@link GithubSponsor} shape and is safe to plug into a Collection
 * without writing a schema by hand.
 */
export const ghSponsorsSchema = vine.array(
  vine.object({
    id: vine.string(),
    isActive: vine.boolean(),
    createdAt: vine.string(),
    privacyLevel: vine.string().nullable(),
    tierName: vine.string().nullable(),
    tierMonthlyPriceInCents: vine.number().nullable(),
    sponsorType: vine.string(),
    sponsorLogin: vine.string(),
    sponsorName: vine.string().nullable().optional(),
    sponsorAvatarUrl: vine.string().nullable().optional(),
    sponsorUrl: vine.string().nullable().optional(),
  })
)

/**
 * A loader that fetches GitHub sponsors for a user or organization.
 * Supports caching and automatic refresh based on a schedule.
 *
 * @example
 * ```ts
 * const loader = new GithubSponsorsLoader({
 *   login: 'adonisjs',
 *   isOrg: true,
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/sponsors.json',
 *   refresh: 'daily'
 * })
 * ```
 */
export class GithubSponsorsLoader<Schema extends SchemaTypes> implements LoaderContract<Schema> {
  /** Configuration options for the GitHub sponsors loader */
  #options: GithubSponsorsOptions

  /** Cache instance for storing and retrieving sponsors data */
  #cache: ReturnType<typeof createCache<GithubSponsor[]>>

  /**
   * Creates a new GitHub sponsors loader instance.
   *
   * @param options - Configuration options for loading GitHub sponsors
   *
   * @example
   * ```ts
   * const loader = new GithubSponsorsLoader({
   *   login: 'thetutlage',
   *   isOrg: false,
   *   ghToken: process.env.GITHUB_TOKEN,
   *   outputPath: './cache/sponsors.json',
   *   refresh: 'weekly'
   * })
   * ```
   */
  constructor(options: GithubSponsorsOptions) {
    this.#options = options
    this.#cache = createCache<GithubSponsor[]>({
      key: 'sponsors',
      outputPath: options.outputPath,
      refresh: options.refresh,
    })
  }

  /**
   * Loads and validates GitHub sponsors data.
   * Uses cached data if available and not expired, otherwise fetches fresh data
   * from GitHub API and updates the cache.
   *
   * @param schema - VineJS schema to validate the sponsors data against
   * @param metadata - Optional metadata to pass to the validator
   *
   * @example
   * ```ts
   * const sponsors = await loader.load(sponsorsSchema)
   * ```
   */
  async load(schema: Schema, metadata?: any) {
    let sponsors = await this.#cache.get()
    if (!sponsors) {
      sponsors = await fetchAllSponsors(this.#options)
      await this.#cache.put(sponsors)
    }

    return vine.validate({
      schema,
      data: sponsors,
      meta: metadata,
    })
  }
}
