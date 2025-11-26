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
import { mergeArrays, fetchReleases } from '../utils.ts'
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
  }

  /**
   * Loads previously cached releases from the output file.
   * Returns an object containing lastFetched timestamp and releases array,
   * or null if the file doesn't exist.
   *
   * @internal
   */
  async #loadExistingReleases(): Promise<{
    lastFetched: string
    releases: GithubReleaseWithRepo[]
  } | null> {
    try {
      debug('loading existing releases file "%s"', this.#options.outputPath)
      return JSON.parse(await readFile(this.#options.outputPath, 'utf-8'))
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    return null
  }

  /**
   * Writes releases to the cache file with the current timestamp.
   * Creates the output directory if it doesn't exist.
   *
   * @param releases - Array of GitHub releases to cache
   * @internal
   */
  async #cacheReleases(releases: GithubReleaseWithRepo[]) {
    debug('caching releasing "%s"', this.#options.outputPath)
    const fileContents = { lastFetched: new Date().toISOString(), releases }
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
    let existingReleases = await this.#loadExistingReleases()
    if (!existingReleases || this.#isExpired(new Date(existingReleases.lastFetched))) {
      debug('fetching releases from github "%s"', this.#options.org)
      const releases = await fetchReleases(this.#options)
      const mergedReleases = existingReleases
        ? mergeArrays(existingReleases.releases, releases, 'url')
        : releases
      existingReleases = await this.#cacheReleases(mergedReleases)
    }

    return vine.validate({
      schema,
      data: existingReleases.releases,
      meta: metadata,
    })
  }
}
