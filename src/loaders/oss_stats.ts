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

import { createCache, aggregateStars, aggregateInstalls } from '../utils.ts'
import type { OssStatsOptions, LoaderContract } from '../types.ts'

/**
 * Type representing the aggregated open source statistics
 */
export type OssStats = {
  /** Total GitHub stars across all sources */
  stars: number
  /** Total npm package downloads across all sources */
  installs: number
}

/**
 * A loader that aggregates open source statistics from multiple sources.
 * Supports GitHub organization stars and npm package download counts.
 * Provides caching and automatic refresh based on a schedule.
 *
 * @example
 * ```ts
 * const loader = new OssStatsLoader({
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
 *         { name: '@adonisjs/core', startDate: '2020-01-01' }
 *       ]
 *     }
 *   ]
 * })
 * ```
 */
export class OssStatsLoader<Schema extends SchemaTypes> implements LoaderContract<Schema> {
  /** Configuration options for the OSS stats loader */
  #options: OssStatsOptions

  /** Cache instance for storing and retrieving OSS stats data */
  #cache: ReturnType<typeof createCache<OssStats>>

  /**
   * Creates a new OSS stats loader instance.
   *
   * @param options - Configuration options for loading OSS statistics
   *
   * @example
   * ```ts
   * const loader = new OssStatsLoader({
   *   outputPath: './cache/oss-stats.json',
   *   refresh: 'weekly',
   *   sources: [
   *     {
   *       type: 'github',
   *       org: 'adonisjs',
   *       ghToken: process.env.GITHUB_TOKEN
   *     }
   *   ]
   * })
   * ```
   */
  constructor(options: OssStatsOptions) {
    this.#options = options
    this.#cache = createCache({
      key: 'ossStats',
      outputPath: options.outputPath,
      contents: { stars: 0, installs: 0 } as OssStats,
      refresh: options.refresh,
    })
  }

  /**
   * Fetches and aggregates statistics from all configured sources.
   * Processes GitHub and npm sources separately, then combines the results.
   *
   * @returns Aggregated statistics with total stars and installs
   *
   * @example
   * ```ts
   * const stats = await loader.fetchStats()
   * console.log(`Total stars: ${stats.stars}`)
   * console.log(`Total installs: ${stats.installs}`)
   * ```
   */
  async #fetchStats(): Promise<OssStats> {
    let totalStars = 0
    let totalInstalls = 0

    for (const source of this.#options.sources) {
      if (source.type === 'github') {
        const stars = await aggregateStars({
          org: source.org,
          ghToken: source.ghToken,
        })
        totalStars += stars
      } else if (source.type === 'npm') {
        const installs = await aggregateInstalls(source.packages)
        totalInstalls += installs
      }
    }

    return { stars: totalStars, installs: totalInstalls }
  }

  /**
   * Loads and validates OSS statistics data.
   * Uses cached data if available and not expired, otherwise fetches fresh data
   * from configured sources and updates the cache.
   *
   * @param schema - VineJS schema to validate the statistics data against
   * @param metadata - Optional metadata to pass to the validator
   *
   * @example
   * ```ts
   * const stats = await loader.load(ossStatsSchema)
   * ```
   */
  async load(schema: Schema, metadata?: any) {
    let stats = await this.#cache.get()
    if (!stats) {
      stats = await this.#fetchStats()
      await this.#cache.put(stats)
    }

    return vine.validate({
      schema,
      data: stats,
      meta: metadata,
    })
  }
}
