/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'
import {
  type GithubSponsor,
  type GithubRelease,
  type GithubReleasesOptions,
  type GithubReleaseWithRepo,
  type GithubSponsorsOptions,
  type GithubContributorNode,
  type GithubContributorsOptions,
} from './types.ts'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import debug from './debug.ts'
import dayjs from 'dayjs'
import { dirname } from 'node:path'

/**
 * Fetches all sponsors for a GitHub user or organization using GraphQL API.
 * Handles pagination automatically to retrieve all sponsors across multiple requests.
 *
 * @param options - Configuration options for fetching sponsors
 *
 * @example
 * ```ts
 * const sponsors = await fetchAllSponsors({
 *   login: 'adonisjs',
 *   isOrg: true,
 *   ghToken: process.env.GITHUB_TOKEN
 * })
 * ```
 */
export async function fetchAllSponsors({
  login,
  isOrg,
  ghToken,
}: GithubSponsorsOptions): Promise<GithubSponsor[]> {
  let hasNext = true
  let cursor: string | null = null

  const allSponsors: GithubSponsor[] = []
  type SponsorshipAsMaintainer = {
    nodes: {
      id: string
      createdAt: string
      privacyLevel: string | null
      isActive: boolean
      sponsorEntity: {
        login: string
        name?: string | null
        avatarUrl?: string | null
        url?: string
        __typename: 'User' | 'Organization' | string
      }
      tier: {
        name: string | null
        isOneTime: boolean
        monthlyPriceInCents: number | null
      } | null
    }[]
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
  }

  const query = `
    query($login: String!, $cursor: String) {
      ${isOrg ? `organization(login: $login)` : `user(login: $login)`} {
        sponsorshipsAsMaintainer(first: 100, after: $cursor) {
          nodes {
            id
            createdAt
            privacyLevel
            isActive
            tier {
              name
              isOneTime
              monthlyPriceInCents
            }
            sponsorEntity {
              __typename
              ... on User {
                login
                name
                avatarUrl
                url
              }
              ... on Organization {
                login
                name
                avatarUrl
                url
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `

  while (hasNext) {
    const data: {
      organization?: {
        sponsorshipsAsMaintainer: SponsorshipAsMaintainer
      }
      user?: {
        sponsorshipsAsMaintainer: SponsorshipAsMaintainer
      }
    } = await graphql(query, {
      headers: {
        authorization: `token ${ghToken}`,
      },
      login,
      cursor,
    })

    const root = isOrg ? data.organization : data.user
    if (!root) {
      break
    }

    const conn = root.sponsorshipsAsMaintainer
    if (!conn || !conn.nodes) {
      break
    }

    for (const node of conn.nodes) {
      const sponsorEntity = node.sponsorEntity
      allSponsors.push({
        id: node.id,
        createdAt: node.createdAt,
        privacyLevel: node.privacyLevel,
        tierName: node.tier?.name ?? null,
        tierMonthlyPriceInCents: node.tier?.monthlyPriceInCents ?? null,
        sponsorType: sponsorEntity.__typename,
        sponsorLogin: sponsorEntity.login,
        sponsorName: sponsorEntity.name ?? null,
        sponsorAvatarUrl: sponsorEntity.avatarUrl ?? null,
        sponsorUrl: sponsorEntity.url ?? null,
      })
    }

    hasNext = conn.pageInfo.hasNextPage
    cursor = conn.pageInfo.endCursor
  }

  return allSponsors
}

/**
 * Fetches all releases from public repositories of a GitHub organization.
 * Handles pagination and supports filtering releases by name patterns.
 *
 * @param options - Configuration options for fetching releases
 *
 * @example
 * ```ts
 * const releases = await fetchReleases({
 *   org: 'adonisjs',
 *   ghToken: process.env.GITHUB_TOKEN,
 *   filters: {
 *     nameIncludes: ['v'],
 *     nameDoesntInclude: ['alpha', 'beta']
 *   }
 * })
 * ```
 */
export async function fetchReleases({
  org,
  ghToken,
  filters,
}: GithubReleasesOptions): Promise<GithubReleaseWithRepo[]> {
  let hasMoreRepos = true
  let orgCursor: string | null = null
  const allReleases: GithubReleaseWithRepo[] = []

  while (hasMoreRepos) {
    const query = `
      query($cursor: String) {
        organization(login: "${org}") {
          repositories(
            first: 10
            after: $cursor
            privacy: PUBLIC
            isArchived: false
          ) {
            nodes {
              name
              releases(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
                nodes {
                  name
                  tagName
                  publishedAt
                  url
                  description
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    `

    const data: {
      organization: {
        repositories: {
          nodes: {
            name: string
            releases: {
              nodes: GithubRelease[]
              pageInfo: {
                endCursor: string | null
                hasNextPage: boolean
              }
            }
          }[]
          pageInfo: {
            endCursor: string | null
            hasNextPage: boolean
          }
        }
      }
    } = await graphql(query, {
      headers: {
        authorization: `token ${ghToken}`,
      },
      cursor: orgCursor,
    })

    for (const repo of data.organization.repositories.nodes) {
      const filtered = repo.releases.nodes
        .filter((r) => {
          if (!filters) {
            return true
          }

          let pickRelease = true
          if (filters.nameDoesntInclude) {
            pickRelease = !filters.nameDoesntInclude.some((substr) => r.name.includes(substr))
          }
          if (pickRelease && filters.nameIncludes) {
            pickRelease = filters.nameIncludes.some((substr) => r.name.includes(substr))
          }

          return pickRelease
        })
        .map((r) => ({
          repo: repo.name,
          ...r,
        }))

      allReleases.push(...filtered)
    }

    hasMoreRepos = data.organization.repositories.pageInfo.hasNextPage
    orgCursor = data.organization.repositories.pageInfo.endCursor
  }

  return allReleases
}

/**
 * Fetches all contributors from all public, non-archived repositories in a GitHub organization.
 * Uses the GitHub REST API with pagination to retrieve contributors from each repository.
 * Handles errors gracefully by logging warnings for failed repositories.
 *
 * @param options - Configuration options for fetching contributors
 *
 * @example
 * ```ts
 * const contributors = await fetchContributorsForOrg({
 *   org: 'adonisjs',
 *   ghToken: process.env.GITHUB_TOKEN
 * })
 * ```
 */
export async function fetchContributorsForOrg({
  org,
  ghToken,
}: GithubContributorsOptions): Promise<GithubContributorNode[]> {
  const REPO_PAGE_SIZE = 100
  const CONTRIB_PAGE_SIZE = 100

  const octokit = new Octokit({ auth: ghToken })
  const repos = await octokit.paginate(octokit.repos.listForOrg, {
    org,
    type: 'public',
    per_page: REPO_PAGE_SIZE,
  })

  const activeRepos = repos.filter((r) => !r.archived)
  const result: GithubContributorNode[] = []

  for (const repo of activeRepos) {
    const repoName = repo.name
    try {
      const contributors = await octokit.paginate(
        octokit.repos.listContributors,
        {
          owner: org,
          repo: repoName,
          per_page: CONTRIB_PAGE_SIZE,
        },
        (response) => response.data
      )

      contributors.forEach((c) => {
        if (c.login) {
          result.push({
            login: c.login,
            id: c.id,
            avatar_url: c.avatar_url ?? null,
            html_url: c.html_url ?? null,
            contributions: c.contributions ?? 0,
          })
        }
      })
    } catch (err: any) {
      console.warn(
        `Warning: failed to fetch contributors for ${org}/${repoName}: ${err?.message ?? err}`
      )
    }
  }

  return result
}

/**
 * Merges two arrays by removing duplicates based on a specified key.
 * Items from the existing array are preserved, and only new unique items
 * from the fresh array are added.
 *
 * @param existing - The existing array to merge into
 * @param fresh - The new array containing potentially duplicate items
 * @param key - The property key to use for identifying duplicates
 *
 * @example
 * ```ts
 * const existing = [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
 * const fresh = [{ id: 2, name: 'bar' }, { id: 3, name: 'baz' }]
 * const merged = mergeArrays(existing, fresh, 'id')
 * // Result: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }, { id: 3, name: 'baz' }]
 * ```
 */
export function mergeArrays<T, K extends keyof T>(existing: T[], fresh: T[], key: K) {
  const seen = new Set<any>()
  const deduped: T[] = []

  for (const r of [...existing, ...fresh]) {
    if (!seen.has(r[key])) {
      seen.add(r[key])
      deduped.push(r)
    }
  }

  return deduped
}

/**
 * Aggregates total npm package downloads across multiple packages from their start dates to today.
 * Fetches download statistics from the npm registry API for each package and sums them up.
 *
 * @param packages - Array of package objects containing name and start date for tracking downloads
 *
 * @example
 * ```ts
 * const total = await aggregateInstalls([
 *   { name: '@adonisjs/core', startDate: '2020-01-01' },
 *   { name: '@adonisjs/lucid', startDate: '2020-01-01' }
 * ])
 * console.log(`Total downloads: ${total}`)
 * ```
 */
export async function aggregateInstalls(packages: { name: string; startDate: string }[]) {
  let total = 0
  for (let pkg of packages) {
    const startDate = pkg.startDate
    const endDate = new Date().toISOString().split('T')[0]
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/${startDate}:${endDate}/${pkg.name}`
    )
    const data = (await res.json()) as { downloads: number }
    total += data.downloads
  }
  return total
}

/**
 * Aggregates the total number of GitHub stars across all public, non-archived repositories
 * in a GitHub organization. Uses pagination to fetch all repositories and sum their stars.
 *
 * @param options - Configuration object containing organization name and GitHub token
 *
 * @example
 * ```ts
 * const stars = await aggregateStars({
 *   org: 'adonisjs',
 *   ghToken: process.env.GITHUB_TOKEN
 * })
 * console.log(`Total stars: ${stars}`)
 * ```
 */
export async function aggregateStars({
  org,
  ghToken,
}: {
  org: string
  ghToken: string
}): Promise<number> {
  let totalStars = 0

  const octokit = new Octokit({ auth: ghToken })
  await octokit.paginate(
    octokit.repos.listForOrg,
    {
      org,
      type: 'public',
      per_page: 100,
    },
    (response) => {
      for (const repo of response.data) {
        if (!repo.archived && repo.stargazers_count) {
          totalStars += repo.stargazers_count
        }
      }
      return response.data
    }
  )

  return totalStars
}

/**
 * Creates a cache manager for storing and retrieving data with time-based expiration.
 * The cache is persisted to disk as JSON and automatically expires based on the configured refresh interval.
 *
 * @param options - Configuration object for the cache
 * @param options.key - The key name for storing the cached data in the JSON file
 * @param options.outputPath - The file system path where the cache file will be stored
 * @param options.contents - The initial contents (not used in the implementation, appears to be unused parameter)
 * @param options.refresh - The refresh interval: 'daily', 'weekly', or 'monthly'
 *
 * @example
 * ```ts
 * const sponsorsCache = createCache({
 *   key: 'sponsors',
 *   outputPath: './cache/sponsors.json',
 *   contents: [],
 *   refresh: 'daily'
 * })
 *
 * // Try to get cached data
 * const cachedSponsors = await sponsorsCache.get()
 * if (!cachedSponsors) {
 *   // Cache expired or doesn't exist, fetch fresh data
 *   const freshSponsors = await fetchAllSponsors({ ... })
 *   await sponsorsCache.put(freshSponsors)
 * }
 * ```
 */
export function createCache<T>({
  key,
  outputPath,
  refresh,
}: {
  key: string
  outputPath: string
  refresh: 'daily' | 'weekly' | 'monthly'
}) {
  /**
   * Checks if the cached data has expired based on the refresh interval.
   *
   * @param fetchDate - The date when the data was last fetched
   */
  function isExpired(fetchDate: Date) {
    switch (refresh) {
      case 'daily':
        return dayjs().isAfter(fetchDate, 'day')
      case 'weekly':
        return dayjs().isAfter(fetchDate, 'week')
      case 'monthly':
        return dayjs().isAfter(fetchDate, 'month')
    }
  }

  return {
    /**
     * Retrieves cached data from disk if it exists and hasn't expired.
     * Returns null if the cache doesn't exist, is expired, or the file is not found.
     *
     * @example
     * ```ts
     * const data = await cache.get()
     * if (data === null) {
     *   console.log('Cache expired or not found')
     * }
     * ```
     */
    async get() {
      try {
        debug('loading %s from file "%s"', key, outputPath)
        const cachedContents = JSON.parse(await readFile(outputPath, 'utf-8'))
        if (!cachedContents || isExpired(new Date(cachedContents.lastFetched))) {
          return null
        }
        return cachedContents[key]
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }

      return null
    },

    /**
     * Saves data to the cache file with the current timestamp.
     * Creates the directory structure if it doesn't exist.
     *
     * @param contents - The data to cache
     *
     * @example
     * ```ts
     * const freshData = await fetchDataFromAPI()
     * await cache.put(freshData)
     * ```
     */
    async put(contents: T): Promise<T> {
      debug('caching %s "%s"', key, outputPath)
      const fileContents = { lastFetched: new Date().toISOString(), [key]: contents }
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, JSON.stringify(fileContents))
      return contents
    },
  }
}
