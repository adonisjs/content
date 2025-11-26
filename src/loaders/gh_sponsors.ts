/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import dayjs from 'dayjs'
import vine from '@vinejs/vine'
import { dirname } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { type Infer, type SchemaTypes } from '@vinejs/vine/types'

import debug from '../debug.ts'
import { fetchAllSponsors } from '../utils.ts'
import type { GithubSponsor, GithubSponsorsOptions, LoaderContract } from '../types.ts'

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
  }

  /**
   * Loads previously cached sponsors from the output file.
   * Returns an object containing lastFetched timestamp and sponsors array,
   * or null if the file doesn't exist.
   *
   * @internal
   */
  async #loadExistingSponsors(): Promise<{
    lastFetched: string
    sponsors: GithubSponsor[]
  } | null> {
    try {
      debug('loading existing sponsors file "%s"', this.#options.outputPath)
      return JSON.parse(await readFile(this.#options.outputPath, 'utf-8'))
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    return null
  }

  /**
   * Writes sponsors to the cache file with the current timestamp.
   * Creates the output directory if it doesn't exist.
   *
   * @param sponsors - Array of GitHub sponsors to cache
   * @internal
   */
  async #cacheSponsors(sponsors: GithubSponsor[]) {
    debug('caching sponsors "%s"', this.#options.outputPath)
    const fileContents = { lastFetched: new Date().toISOString(), sponsors }
    await mkdir(dirname(this.#options.outputPath), { recursive: true })
    await writeFile(this.#options.outputPath, JSON.stringify(fileContents))
    return fileContents
  }

  /**
   * Determines if the cached data has expired based on the refresh schedule.
   *
   * @param fetchDate - The date when data was last fetched
   * @internal
   */
  #isExpired(fetchDate: Date) {
    switch (this.#options.refresh) {
      case 'daily':
        return dayjs().isAfter(fetchDate, 'day')
      case 'weekly':
        return dayjs().isAfter(fetchDate, 'week')
      case 'monthly':
        return dayjs().isAfter(fetchDate, 'month')
    }
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
    let existingSponsors = await this.#loadExistingSponsors()
    if (!existingSponsors || this.#isExpired(new Date(existingSponsors.lastFetched))) {
      debug('fetching sponsors from github "%s"', this.#options.login)
      const sponsors = await fetchAllSponsors(this.#options)
      existingSponsors = await this.#cacheSponsors(sponsors)
    }

    return vine.validate({
      schema,
      data: existingSponsors.sponsors,
      meta: metadata,
    })
  }
}
