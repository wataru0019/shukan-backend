import dotenv from 'dotenv'
dotenv.config()
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { ChatOpenAI } from '@langchain/openai'

const app = new Hono()
const api = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

api.get("/", (c) => {
  return c.text("Hello Api")
})

api.get("/ai", async (c) => {
  const model = new ChatOpenAI({
    model: "gpt-5-nano",
    apiKey: process.env.OPENAI_API_KEY
  })

  const res = await model.invoke("hello")
  return c.text(typeof res.content === "string" ? res.content : JSON.stringify(res.content))
})

api.get("/:id", (c) => {
  const id = c.req.param('id')
  return c.text(id)
})

app.route("/api", api)

const port = parseInt(process.env.PORT || '3000')

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
