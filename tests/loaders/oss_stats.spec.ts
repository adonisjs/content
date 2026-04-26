/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { env } from '../helpers.ts'
import { OssStatsLoader, ossStatsSchema } from '../../src/loaders/oss_stats.ts'

test.group('OSS stats loader', () => {
  test('fetch and aggregate OSS stats from GitHub and npm sources', async ({ assert, fs }) => {
    const ossStatsLoader = new OssStatsLoader<typeof ossStatsSchema>({
      outputPath: join(fs.basePath, 'oss-stats.json'),
      refresh: 'weekly',
      sources: [
        {
          type: 'github',
          org: 'japa',
          ghToken: env.get('GH_TOKEN'),
        },
        {
          type: 'npm',
          packages: [{ name: '@japa/runner', startDate: '2020-01-01' }],
        },
      ],
    })

    const stats = await ossStatsLoader.load(ossStatsSchema)
    assert.isObject(stats)
    assert.isNumber(stats.stars)
    assert.isNumber(stats.installs)
    assert.isAbove(stats.stars, 0)
    assert.isAbove(stats.installs, 0)
  }).disableTimeout()
})
