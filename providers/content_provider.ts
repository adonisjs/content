/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/vite/vite_provider" />

import { isAbsolute, resolve } from 'node:path'
import vine, { VineString } from '@vinejs/vine'
import { type ApplicationService } from '@adonisjs/core/types'
import { Collection } from '../src/collection.ts'
import { readFile } from 'node:fs/promises'

declare module '@vinejs/vine' {
  interface VineString {
    toContents(): this

    /**
     * Converts a relative path to a Vite asset path.
     * This method transforms the path using Vite's asset resolution system.
     */
    toVitePath(): this

    /**
     * Converts a relative path to an absolute file system path.
     * The path is resolved relative to the menu file root directory.
     */
    toAbsolutePath(): this
  }
}

/**
 * Vine validation rule that converts a relative path to a Vite asset path.
 *
 * @param value - The value being validated
 * @param _ - Vine options (unused)
 * @param field - The field context containing metadata and mutation methods
 *
 * @example
 * ```ts
 * const schema = vine.object({
 *   icon: vine.string().toVitePath()
 * })
 * ```
 */
const toVitePath = vine.createRule(function vitePath(value, _, field) {
  if (typeof value === 'string') {
    value = isAbsolute(value) ? value : resolve(field.meta.menuFileRoot, value)
    field.mutate(field.meta.vite.assetPath(field.meta.app.relativePath(value)), field)
  }
})

/**
 * Vine validation rule that reads the contents of a file at the given path
 * and replaces the field value with the file contents.
 *
 * The path is resolved relative to the menu file root directory.
 *
 * @param value - The relative file path to read
 * @param _ - Vine options (unused)
 * @param field - The field context containing metadata and mutation methods
 *
 * @example
 * ```ts
 * const schema = vine.object({
 *   content: vine.string().toContents()
 * })
 * ```
 */
const toContents = vine.createRule(
  async function contents(value, _, field) {
    if (typeof value === 'string') {
      const absolutePath = resolve(field.meta.menuFileRoot, value)
      field.mutate(await readFile(absolutePath, 'utf-8'), field)
    }
  },
  {
    isAsync: true,
  }
)

/**
 * Vine validation rule that converts a relative path to an absolute file system path.
 *
 * @param value - The value being validated
 * @param _ - Vine options (unused)
 * @param field - The field context containing metadata and mutation methods
 *
 * @example
 * ```ts
 * const schema = vine.object({
 *   filePath: vine.string().toAbsolutePath()
 * })
 * ```
 */
const toAbsolutePath = vine.createRule(function absolutePath(value, _, field) {
  field.mutate(resolve(field.meta.menuFileRoot, value as string), field)
})

/**
 * Extends VineString with the `toVitePath` method.
 *
 * @example
 * ```ts
 * const schema = vine.object({
 *   icon: vine.string().toVitePath()
 * })
 * ```
 */
VineString.macro('toVitePath', function (this: VineString) {
  return this.use(toVitePath())
})

/**
 * Extends VineString with the `toAbsolutePath` method.
 *
 * @example
 * ```ts
 * const schema = vine.object({
 *   file: vine.string().toAbsolutePath()
 * })
 * ```
 */
VineString.macro('toAbsolutePath', function (this: VineString) {
  return this.use(toAbsolutePath())
})

/**
 * Extends VineString with the `toContents` method.
 *
 * @example
 * ```ts
 * const schema = vine.object({
 *   readme: vine.string().toContents()
 * })
 * ```
 */
VineString.macro('toContents', function (this: VineString) {
  return this.use(toContents())
})

/**
 * Service provider for the AdonisJS content package.
 *
 * This provider sets up the content collection system and integrates
 * with Vite for asset handling if Vite is available in the application.
 *
 * @example
 * ```ts
 * export default {
 *   providers: [
 *     () => import('@adonisjs/content/content_provider')
 *   ]
 * }
 * ```
 */
export default class ContentProvider {
  /**
   * Creates a new instance of the content provider.
   *
   * @param app - The AdonisJS application service instance
   */
  constructor(protected app: ApplicationService) {}

  /**
   * Boots the content provider during the application boot phase.
   *
   * If Vite is registered in the container, this method configures
   * the Collection class to use Vite's asset resolution system.
   */
  async boot() {
    Collection.useApp(this.app)
    if (this.app.container.hasBinding('vite')) {
      const vite = await this.app.container.make('vite')
      Collection.useVite(vite)
    }
  }
}
