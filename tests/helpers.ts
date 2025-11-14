/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Env } from '@adonisjs/core/env'

export const env = await Env.create(new URL('../', import.meta.url), {
  GH_TOKEN: Env.schema.string(),
})
