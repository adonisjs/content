/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine from '@vinejs/vine'
import { join } from 'node:path'
import { test } from '@japa/runner'
import { env } from '../helpers.ts'
import { GithubProjectLoader } from '../../src/loaders/gh_project.ts'

test.group('Github project loader', () => {
  test('fetch project cards and write them to a file', async ({ assert, fs }) => {
    const cardsSchema = vine.array(
      vine.object({
        id: vine.string(),
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

    const ghProjectLoader = new GithubProjectLoader<typeof cardsSchema>({
      ghToken: env.get('GH_TOKEN'),
      login: 'adonisjs',
      isOrg: true,
      projectNumber: 8,
      outputPath: join(fs.basePath, 'project.json'),
      refresh: 'weekly',
    })

    const cards = await ghProjectLoader.load(cardsSchema)
    assert.isArray(cards)
  }).disableTimeout()

  test('skip cards by status', async ({ assert, fs }) => {
    const cardsSchema = vine.array(
      vine.object({
        id: vine.string(),
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

    const ghProjectLoader = new GithubProjectLoader<typeof cardsSchema>({
      ghToken: env.get('GH_TOKEN'),
      login: 'adonisjs',
      isOrg: true,
      projectNumber: 8,
      outputPath: join(fs.basePath, 'project-filtered.json'),
      refresh: 'weekly',
      skipStatuses: ['Done'],
    })

    const cards = await ghProjectLoader.load(cardsSchema)
    assert.isArray(cards)
    for (const card of cards) {
      if (card.status) {
        assert.notEqual(card.status.toLowerCase(), 'done')
      }
    }
  }).disableTimeout()
})
