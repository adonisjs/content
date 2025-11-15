/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debuglog } from 'node:util'

/**
 * Debug logger for the @adonisjs/content package.
 * Enable debug logs by setting NODE_DEBUG=adonisjs:content environment variable.
 *
 * @example
 * ```ts
 * debug('loading file "%s"', filePath)
 * ```
 */
export default debuglog('adonisjs:content')
