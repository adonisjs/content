/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  type GithubSponsorsOptions,
  type GithubReleasesOptions,
  type GithubContributorsOptions,
} from '../types.ts'
import { GithubSponsorsLoader } from './gh_sponsors.ts'
import { GithubReleasesLoader } from './gh_releases.ts'
import { GithubContributorsLoader } from './gh_contributors.ts'
import { JsonLoader } from './json.ts'

/**
 * Factory functions for creating content loaders.
 * Provides convenient access to GitHub-based data loaders.
 *
 * @example
 * ```ts
 * const sponsorsLoader = loaders.ghSponsors({
 *   login: 'adonisjs',
 *   isOrg: true,
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/sponsors.json',
 *   refresh: 'daily'
 * })
 *
 * const collection = new Collection({
 *   schema: sponsorsSchema,
 *   loader: sponsorsLoader,
 *   cache: true
 * })
 * ```
 */
export const loaders = {
  /**
   * Creates a GitHub sponsors loader instance.
   *
   * @param options - Configuration options for the sponsors loader
   *
   * @example
   * ```ts
   * const loader = loaders.ghSponsors({
   *   login: 'adonisjs',
   *   isOrg: true,
   *   ghToken: process.env.GITHUB_TOKEN,
   *   outputPath: './cache/sponsors.json',
   *   refresh: 'daily'
   * })
   * ```
   */
  ghSponsors(options: GithubSponsorsOptions) {
    return new GithubSponsorsLoader(options)
  },
  /**
   * Creates a GitHub contributors loader instance.
   *
   * @param options - Configuration options for the contributors loader
   *
   * @example
   * ```ts
   * const loader = loaders.ghContributors({
   *   org: 'adonisjs',
   *   ghToken: process.env.GITHUB_TOKEN,
   *   outputPath: './cache/contributors.json',
   *   refresh: 'weekly'
   * })
   * ```
   */
  ghContributors(options: GithubContributorsOptions) {
    return new GithubContributorsLoader(options)
  },
  /**
   * Creates a GitHub releases loader instance.
   *
   * @param options - Configuration options for the releases loader
   *
   * @example
   * ```ts
   * const loader = loaders.ghReleases({
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
  ghReleases(options: GithubReleasesOptions) {
    return new GithubReleasesLoader(options)
  },

  /**
   * Creates a JSON file loader instance.
   *
   * @param source - Path to the JSON file to load
   *
   * @example
   * ```ts
   * const loader = loaders.jsonLoader('./data/menu.json')
   * ```
   */
  jsonLoader(source: string) {
    return new JsonLoader(source)
  },
}
