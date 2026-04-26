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
import {
  GithubContributorsLoader,
  ghContributorsSchema,
} from '../../src/loaders/gh_contributors.ts'

test.group('Github contributors loader', () => {
  test('fetch github contributors and write them to a file', async ({ assert, fs }) => {
    const ghContributorsLoader = new GithubContributorsLoader<typeof ghContributorsSchema>({
      ghToken: env.get('GH_TOKEN'),
      org: 'japa',
      outputPath: join(fs.basePath, 'contributors.json'),
      refresh: 'weekly',
    })

    const contributors = await ghContributorsLoader.load(ghContributorsSchema)
    assert.isArray(contributors)
    assert.exists(contributors[0].login)
  }).disableTimeout()
})
