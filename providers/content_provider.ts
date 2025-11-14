/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/vite/vite_provider" />

import { resolve } from 'node:path'
import vine, { VineString } from '@vinejs/vine'
import { type ApplicationService } from '@adonisjs/core/types'
import { Collection } from '../src/collection.ts'

declare module '@vinejs/vine' {
  interface VineString {
    toVitePath(): this
    toAbsolutePath(): this
  }
}

const toVitePath = vine.createRule(function vitePath(value, _, field) {
  field.mutate(field.meta.vite.assetPath(value), field)
})
const toAbsolutePath = vine.createRule(function absolutePath(value, _, field) {
  field.mutate(resolve(field.meta.menuFileRoot, value as string), field)
})

VineString.macro('toVitePath', function (this: VineString) {
  return this.use(toVitePath())
})
VineString.macro('toAbsolutePath', function (this: VineString) {
  return this.use(toAbsolutePath())
})

export default class ContentProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.container.hasBinding('vite')) {
      const vite = await this.app.container.make('vite')
      Collection.useVite(vite)
    }
  }
}
