/*
 * @adonisjs/content
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine from '@vinejs/vine'
import { test } from '@japa/runner'
import { type Infer } from '@vinejs/vine/types'
import { Collection } from '../src/collection.js'

test.group('Collection | types', () => {
  test('define a collection with schema and loader', async ({ assert, expectTypeOf }) => {
    const collection = new Collection({
      cache: false,
      schema: vine.array(
        vine.object({
          category: vine.string(),
          children: vine.array(
            vine.object({
              permalink: vine.string(),
            })
          ),
        })
      ),
      loader: {
        load(schema) {
          return vine.validate({ schema, data: [] })
        },
      },
    })

    const query = await collection.load()
    const allData = query.all()
    assert.deepEqual(allData, [])

    expectTypeOf(allData).toEqualTypeOf<{ category: string; children: { permalink: string }[] }[]>()
  })

  test('define collection views', async ({ assert, expectTypeOf }) => {
    const docsSchema = vine.array(
      vine.object({
        category: vine.string(),
        children: vine.array(
          vine.object({
            permalink: vine.string(),
          })
        ),
      })
    )
    type DocsSchema = Infer<typeof docsSchema>

    const views = {
      list(data: DocsSchema) {
        return data.flatMap((node) => node.children)
      },
      findByPermalink(data: DocsSchema, permalink: string) {
        const flatList = this.list(data)
        return flatList.find((node) => node.permalink === permalink)
      },
    }

    const collection = new Collection({
      cache: false,
      schema: docsSchema,
      loader: {
        load(schema) {
          return vine.validate({ schema, data: [] })
        },
      },
      views,
    })

    const query = await collection.load()
    assert.equal(query.findByPermalink('hello'), undefined)
    assert.deepEqual(query.list(), [])

    expectTypeOf(query.findByPermalink('hello')).toEqualTypeOf<{ permalink: string } | undefined>()
    expectTypeOf(query.list()).toEqualTypeOf<{ permalink: string }[]>()
  })

  test('cache data after first read', async ({ assert }) => {
    const docsSchema = vine.array(
      vine.object({
        category: vine.string(),
        children: vine.array(
          vine.object({
            permalink: vine.string(),
          })
        ),
      })
    )
    type DocsSchema = Infer<typeof docsSchema>

    const views = {
      list(data: DocsSchema) {
        return data.flatMap((node) => node.children)
      },
      findByPermalink(data: DocsSchema, permalink: string) {
        const flatList = this.list(data)
        return flatList.find((node) => node.permalink === permalink)
      },
    }

    const data: any[] = []
    const collection = new Collection({
      cache: true,
      schema: docsSchema,
      loader: {
        load(schema) {
          return vine.validate({ schema, data })
        },
      },
      views,
    })

    const query = await collection.load()
    assert.deepEqual(query.list(), [])

    data.push({ category: 'foo', children: [{ permalink: '/foo' }] })
    const query1 = await collection.load()
    assert.deepEqual(query1.list(), [])
  })

  test('do not cache data after first read', async ({ assert }) => {
    const docsSchema = vine.array(
      vine.object({
        category: vine.string(),
        children: vine.array(
          vine.object({
            permalink: vine.string(),
          })
        ),
      })
    )
    type DocsSchema = Infer<typeof docsSchema>

    const views = {
      list(data: DocsSchema) {
        return data.flatMap((node) => node.children)
      },
      findByPermalink(data: DocsSchema, permalink: string) {
        const flatList = this.list(data)
        return flatList.find((node) => node.permalink === permalink)
      },
    }

    const data: any[] = []
    const collection = new Collection({
      cache: false,
      schema: docsSchema,
      loader: {
        load(schema) {
          return vine.validate({ schema, data })
        },
      },
      views,
    })

    const query = await collection.load()
    assert.deepEqual(query.list(), [])

    data.push({ category: 'foo', children: [{ permalink: '/foo' }] })
    const query1 = await collection.load()
    assert.deepEqual(query1.list(), [{ permalink: '/foo' }])
  })

  test('define multiple collection', async ({ assert, expectTypeOf }) => {
    const docsSchema = vine.array(
      vine.object({
        category: vine.string(),
        children: vine.array(
          vine.object({
            permalink: vine.string(),
          })
        ),
      })
    )
    type DocsSchema = Infer<typeof docsSchema>

    const views = {
      list(data: DocsSchema) {
        return data.flatMap((node) => node.children)
      },
      findByPermalink(data: DocsSchema, permalink: string) {
        const flatList = this.list(data)
        return flatList.find((node) => node.permalink === permalink)
      },
    }

    const sections = Collection.multi(['docs', 'tutorial'], () => {
      return Collection.create({
        cache: false,
        schema: docsSchema,
        loader: {
          load(schema) {
            return vine.validate({ schema, data: [] })
          },
        },
        views,
      })
    })

    const docs = await sections.docs.load()
    const tutorial = await sections.tutorial.load()

    assert.equal(tutorial.findByPermalink('hello'), undefined)
    assert.deepEqual(tutorial.list(), [])
    expectTypeOf(tutorial.findByPermalink('hello')).toEqualTypeOf<
      { permalink: string } | undefined
    >()
    expectTypeOf(tutorial.list()).toEqualTypeOf<{ permalink: string }[]>()

    assert.equal(docs.findByPermalink('hello'), undefined)
    assert.deepEqual(docs.list(), [])
    expectTypeOf(docs.findByPermalink('hello')).toEqualTypeOf<{ permalink: string } | undefined>()
    expectTypeOf(docs.list()).toEqualTypeOf<{ permalink: string }[]>()
  })
})
