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
import { type SchemaTypes } from '@vinejs/vine/types'

import debug from '../debug.ts'
import { fetchContributorsForOrg } from '../utils.ts'
import type { GithubContributorNode, GithubContributorsOptions, LoaderContract } from '../types.ts'

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
export class GithubContributorsLoader<Schema extends SchemaTypes>
  implements LoaderContract<Schema>
{
  /** Configuration options for the GitHub contributors loader */
  #options: GithubContributorsOptions

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
  }

  /**
   * Loads previously cached contributors from the output file.
   * Returns an object containing lastFetched timestamp and contributors array,
   * or null if the file doesn't exist.
   *
   * @internal
   */
  async #loadExistingContributors(): Promise<{
    lastFetched: string
    contributors: GithubContributorNode[]
  } | null> {
    try {
      debug('loading existing contributors file "%s"', this.#options.outputPath)
      return JSON.parse(await readFile(this.#options.outputPath, 'utf-8'))
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    return null
  }

  /**
   * Writes contributors to the cache file with the current timestamp.
   * Creates the output directory if it doesn't exist.
   *
   * @param contributors - Array of GitHub contributors to cache
   * @internal
   */
  async #cacheContributors(contributors: GithubContributorNode[]) {
    debug('caching contributors "%s"', this.#options.outputPath)
    const fileContents = { lastFetched: new Date().toISOString(), contributors }
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
    let existingContributors = await this.#loadExistingContributors()
    if (!existingContributors || this.#isExpired(new Date(existingContributors.lastFetched))) {
      debug('fetching contributors from github "%s"', this.#options.org)
      const contributors = await fetchContributorsForOrg(this.#options)
      existingContributors = await this.#cacheContributors(contributors)
    }

    return vine.validate({
      schema,
      data: existingContributors.contributors,
      meta: metadata,
    })
  }
}
