/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine from '@vinejs/vine'
import { dirname } from 'node:path'
import { readFile } from 'node:fs/promises'
import { type SchemaTypes } from '@vinejs/vine/types'

import debug from '../debug.ts'
import type { LoaderContract } from '../types.ts'

/**
 * A loader that reads and validates JSON data from a file.
 * Implements the LoaderContract to provide JSON file loading with schema validation.
 *
 * @example
 * ```ts
 * const loader = new JsonLoader('./data/config.json')
 * const collection = new Collection({
 *   schema: configSchema,
 *   loader,
 *   cache: true
 * })
 * ```
 */
export class JsonLoader<Schema extends SchemaTypes> implements LoaderContract<Schema> {
  /** Path to the JSON file to load */
  #source: string

  /**
   * Creates a new JSON loader instance.
   *
   * @param source - Absolute or relative path to the JSON file
   *
   * @example
   * ```ts
   * const loader = new JsonLoader('./data/menu.json')
   * ```
   */
  constructor(source: string) {
    this.#source = source
  }

  /**
   * Loads and validates JSON data from the configured file.
   * The directory of the source file is provided as metadata during validation.
   *
   * @param schema - VineJS schema to validate the loaded JSON data against
   * @param metadata - Optional metadata to pass to the validator
   *
   * @example
   * ```ts
   * const data = await loader.load(menuSchema)
   * ```
   */
  async load(schema: Schema, metadata?: any) {
    const menuFileRoot = dirname(this.#source)
    const menu = JSON.parse(await readFile(this.#source, 'utf-8'))
    debug('loading file "%s"', this.#source)
    return vine.validate({ schema, data: menu, meta: { menuFileRoot, ...metadata } })
  }
}
