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

import { createCache, fetchProjectItems } from '../utils.ts'
import type { GithubProjectCard, GithubProjectOptions, LoaderContract } from '../types.ts'

/**
 * Default VineJS schema for the data returned by {@link GithubProjectLoader}.
 * Matches the {@link GithubProjectCard} shape and is safe to plug into a
 * Collection without writing a schema by hand.
 */
export const ghProjectSchema = vine.array(
  vine.object({
    id: vine.string(),
    databaseId: vine.number().nullable().optional(),
    type: vine.enum(['ISSUE', 'PULL_REQUEST', 'DRAFT_ISSUE'] as const),
    title: vine.string(),
    url: vine.string().nullable(),
    number: vine.number().nullable(),
    state: vine.string().nullable(),
    status: vine.string().nullable(),
    priority: vine.string().nullable(),
    effort: vine.number().nullable(),
    labels: vine.array(vine.string()),
    assignees: vine.array(
      vine.object({
        login: vine.string(),
        name: vine.string().nullable(),
        avatarUrl: vine.string().nullable(),
        url: vine.string().nullable(),
      })
    ),
    description: vine.string().nullable(),
    summary: vine.string().nullable(),
    customFields: vine.record(vine.any()),
  })
)

/**
 * A loader that fetches cards from a GitHub Projects v2 (kanban) board. Resolves
 * each card's title, status, assignees, priority, effort, labels, body, and any
 * custom project fields. Supports caching, scheduled refresh, and skipping cards
 * by Status column value.
 *
 * @example
 * ```ts
 * const loader = new GithubProjectLoader({
 *   login: 'adonisjs',
 *   isOrg: true,
 *   projectNumber: 5,
 *   ghToken: process.env.GITHUB_TOKEN,
 *   outputPath: './cache/board.json',
 *   refresh: 'daily',
 *   skipStatuses: ['Backlog', 'Done']
 * })
 * ```
 */
export class GithubProjectLoader<Schema extends SchemaTypes> implements LoaderContract<Schema> {
  /** Configuration options for the GitHub project loader */
  #options: GithubProjectOptions

  /** Cache instance for storing and retrieving project cards */
  #cache: ReturnType<typeof createCache<GithubProjectCard[]>>

  /**
   * Creates a new GitHub project loader instance.
   *
   * @param options - Configuration options for loading project cards
   */
  constructor(options: GithubProjectOptions) {
    this.#options = options
    this.#cache = createCache<GithubProjectCard[]>({
      key: 'projectCards',
      outputPath: options.outputPath,
      refresh: options.refresh,
    })
  }

  /**
   * Loads and validates GitHub Projects v2 cards. Returns cached data when
   * available and not expired, otherwise fetches fresh cards from the GitHub
   * GraphQL API and replaces the cache.
   *
   * @param schema - VineJS schema to validate the cards data against
   * @param metadata - Optional metadata to pass to the validator
   *
   * @example
   * ```ts
   * const cards = await loader.load(cardsSchema)
   * ```
   */
  async load(schema: Schema, metadata?: any) {
    let cards = await this.#cache.get()
    if (!cards) {
      cards = await fetchProjectItems(this.#options)
      await this.#cache.put(cards)
    }

    return vine.validate({
      schema,
      data: cards,
      meta: metadata,
    })
  }
}
