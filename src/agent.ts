import dotenv from 'dotenv'
dotenv.config()
import { createAgent, providerStrategy, ProviderStrategy } from 'langchain'
import * as z from "zod"

const Goals = z.object({
    short_term_goal: z.string().describe("短期的な目標を出力する"),
    mid_term_goal: z.string().describe("中期的な目標を出力する"),
    long_term_goal: z.string().describe("長期的な目標を出力する"),
})

export const agent = createAgent({
    model: "gpt-5-nano",
    tools: [],
    responseFormat: providerStrategy(Goals)
})

// const result = await agent.invoke({
//     messages: [
//         { role: 'system', content: `
//             あなたは優秀なコーチです。
//             ユーザーの目標達成に向け、短期・中期・長期の目標を出力しなさい` },
//         { role: 'user', content: 'ビジネスシーンにおいて英語で会話できるようになる。' }
//     ]
// })

// console.log(result.structuredResponse)