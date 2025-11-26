/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Vite } from '@adonisjs/vite'
import { type Infer, type SchemaTypes } from '@vinejs/vine/types'

import debug from './debug.ts'
import { type CollectionOptions, type ViewFn, type ViewsToQueryMethods } from './types.js'

/**
 * Manages a collection of data with schema validation and custom view functions.
 *
 * The Collection class provides a way to load, validate, and query structured data
 * using VineJS schemas. It supports caching and custom view functions for data
 * transformations and queries.
 *
 * @example
 * ```ts
 * const posts = new Collection({
 *   schema: postsSchema,
 *   loader: fileLoader,
 *   cache: true,
 *   views: {
 *     published: (posts) => posts.filter(p => p.published),
 *     findBySlug: (posts, slug) => posts.find(p => p.slug === slug)
 *   }
 * })
 *
 * const query = await posts.load()
 * const allPosts = query.all()
 * const publishedPosts = query.published()
 * const post = query.findBySlug('hello-world')
 * ```
 */
export class Collection<
  Schema extends SchemaTypes,
  Views extends Record<string, ViewFn<Schema, any, any>>,
> {
  static #vite?: Vite
  /** Collection configuration options */
  #options: CollectionOptions<Schema, Views>
  /** Cached validated data */
  #data?: Infer<Schema>
  #views?: ViewsToQueryMethods<Views>

  /**
   * Creates a new Collection instance.
   *
   * @param options - Configuration options including schema, loader, caching, and views
   *
   * @example
   * ```ts
   * const posts = new Collection({
   *   schema: postsSchema,
   *   loader: fileLoader,
   *   cache: true,
   *   views: { published: (posts) => posts.filter(p => p.published) }
   * })
   * ```
   */
  constructor(options: CollectionOptions<Schema, Views>) {
    this.#options = options
  }

  /**
   * Factory method to create a new Collection instance.
   * This is an alternative to using the constructor directly.
   *
   * @param options - Configuration options including schema, loader, caching, and views
   *
   * @example
   * ```ts
   * const posts = Collection.create({
   *   schema: postsSchema,
   *   loader: fileLoader,
   *   cache: true,
   *   views: { published: (posts) => posts.filter(p => p.published) }
   * })
   * ```
   */
  static create<Schema extends SchemaTypes, Views extends Record<string, ViewFn<Schema, any, any>>>(
    options: CollectionOptions<Schema, Views>
  ) {
    return new Collection<Schema, Views>(options)
  }

  /**
   * Creates multiple collection instances by mapping over sections.
   * Useful for generating collections for different categories or sections.
   *
   * @param sections - Array of section identifiers
   * @param callback - Function to create a collection for each section
   *
   * @example
   * ```ts
   * const collections = Collection.multi(
   *   ['api', 'guides', 'tutorials'],
   *   (section) => new Collection({
   *     schema: docsSchema,
   *     loader: loaders.jsonLoader(`./docs/${section}.json`),
   *     cache: true
   *   })
   * )
   * // Results in: { api: Collection, guides: Collection, tutorials: Collection }
   * ```
   */
  static multi<Section extends string, Callback extends (section: Section) => any>(
    sections: Section[],
    callback: Callback
  ): {
    [K in Section]: ReturnType<Callback>
  } {
    return sections.reduce(
      (result, section) => {
        result[section] = callback(section)
        return result
      },
      {} as {
        [K in Section]: ReturnType<Callback>
      }
    )
  }

  /**
   * Configures the Vite service instance for resolving asset paths.
   * This should be called once during application initialization.
   *
   * @param vite - The Vite service instance from @adonisjs/vite
   *
   * @example
   * ```ts
   * Collection.useVite(vite)
   * ```
   */
  static useVite(vite: Vite) {
    this.#vite = vite
  }

  /**
   * Loads and validates data using the configured loader and schema.
   * Returns cached data if caching is enabled and data was previously loaded.
   *
   * @example
   * ```ts
   * const data = await posts.hydrate()
   * ```
   */
  async hydrate() {
    if (this.#data && this.#views && this.#options.cache) {
      debug('re-using data and views from cache')
      return {
        data: this.#data,
        views: this.#views,
      }
    }

    debug('computing data')
    this.#data = await this.#options.loader.load(this.#options.schema, {
      vite: Collection.#vite,
      ...this.#options.validatorMetaData,
    })

    const views = this.#options.views ?? ({} as Views)
    this.#views = Object.keys(views).reduce<ViewsToQueryMethods<Views>>((result, view) => {
      ;(result as any)[view] = (...args: any[]) => views[view](this.#data, ...args)
      return result
    }, {} as ViewsToQueryMethods<Views>)

    return {
      data: this.#data,
      views: this.#views,
    }
  }

  /**
   * Loads the collection and returns a query interface with all() method
   * and any configured view methods.
   *
   * The returned object includes:
   * - all(): Returns the complete validated dataset
   * - Custom view methods as configured in collection options
   *
   * @example
   * ```ts
   * const query = await posts.load()
   *
   * // Get all data
   * const allPosts = query.all()
   *
   * // Use custom view methods
   * const publishedPosts = query.published()
   * const post = query.findBySlug('hello-world')
   * ```
   */
  async load(): Promise<
    {
      all(): Infer<Schema>
    } & ViewsToQueryMethods<Views>
  > {
    const { data, views } = await this.hydrate()

    return {
      all() {
        return data
      },
      ...views,
    }
  }
}
