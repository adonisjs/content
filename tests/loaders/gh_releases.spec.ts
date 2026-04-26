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
import { GithubReleasesLoader, ghReleasesSchema } from '../../src/loaders/gh_releases.ts'

test.group('Github releases loader', () => {
  test('fetch github releases and write them to a file', async ({ assert, fs }) => {
    const ghReleaseLoader = new GithubReleasesLoader<typeof ghReleasesSchema>({
      ghToken: env.get('GH_TOKEN'),
      org: 'vinejs',
      outputPath: join(fs.basePath, 'releases.json'),
      refresh: 'weekly',
    })

    const releases = await ghReleaseLoader.load(ghReleasesSchema)
    assert.isArray(releases)
    assert.exists(releases[0].url)
  }).disableTimeout()
})
