import dotenv from 'dotenv'
dotenv.config()
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ChatOpenAI } from '@langchain/openai'
import { agent } from './agent.ts'

const app = new Hono()
const api = new Hono()

app.use('*', cors())

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

api.post('/agent', async (c) => {
  const requestData = await c.req.json()
  const res = await agent.invoke({ messages: [{ role: "user", content: requestData.query }] });
  const agentReply = res.messages[1]?.content;
  return c.json(agentReply)
  // return c.json({ ai_message: agentReply })
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
