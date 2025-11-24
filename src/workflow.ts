import dotenv from "dotenv";
dotenv.config();

import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// const MessagesState = z.object({
//     messages: z
//         .array(z.custom<BaseMessage>())
//         .register(registry, MessagesZodMeta),
//     llmCalls: z.number().optional(),
// })
const Goals = z.object({
    short_term_goal: z.string().describe("短期的な目標を出力する"),
    mid_term_goal: z.string().describe("中期的な目標を出力する"),
    long_term_goal: z.string().describe("長期的な目標を出力する"),
})

const Task = z.object({
    goal: z.string().describe("タスクの目標を出力する"),
    name: z.string().describe(`
        タスクの名前を出力する。
        タスクの名前は、タスクの内容を端的に表したものとすること。
        なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。

        ＜例＞
        以下のようなgoalが設定されている場合、
        3日後までに基本フレーズを50件覚えるために、「毎日50個単語カードを使って学習し、単語テストをする」と言うタスク名を出力する。
        goal: "自己紹介と日常表現の基本フレーズを50件覚え、毎日30分の独学と週2回のオンライン英会話で実践練習を継続する。"

        `),
    description: z.string().describe(`
        タスクの説明を出力する。タスク名からタスクの説明を推測する。
        なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
        また、タスクは複数個設定するため、単一のタスクで全て網羅する必要はありません。
        `),
    priority: z.string().describe("タスクの優先度を出力する"),
    due_date: z.string().describe("タスクの期限を出力する"),
})

const judgeD = z.object({
    is_sufficient: z.boolean().describe("タスクが十分かどうかを判断する")
})

const customState = z.object({
    messages: z.array(
        z.object({
            role: z.string(),
            content: z.string()
        })
    ),
    goals: Goals,
    tasks: z.array(Task)
})

const model = new ChatOpenAI({
    model: "gpt-5-nano",
})

const strucruedModel = model.withStructuredOutput(Goals);
const strucruedModelTasks = model.withStructuredOutput(Task);
const strucruedModelJudge = model.withStructuredOutput(judgeD);
// const result = await strucruedModelTasks.invoke("フルマラソンのタイムを3時間以内に短縮する。")
// console.log(result)

const chatNode = async (state: z.infer<typeof customState>) => {
    const result = await strucruedModel.invoke(state.messages)
    return {
        messages: [...state.messages, { role: 'assistant', content: "目標を設定しました。" }],
        goals: result
    }
}

const createShortTermTasks = async (state: z.infer<typeof customState>) => {
    let tasks: z.infer<typeof Task>[] = state.tasks || [];
    const result = await strucruedModelTasks.invoke(`
        以下の#目標 を達成するために必要な詳細タスクを出力してください。
        なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
        また、#タスクリスト を参考に重複しない内容で出力してください。

        #目標
        ${state.goals.short_term_goal}

        #タスクリスト
        ${JSON.stringify(state.tasks)}
    `)
    tasks.push(result)

    return {
        messages: [...state.messages, { role: 'assistant', content: "タスクを設定しました。" }],
        tasks: tasks
    }
}

const createMidTermTasks = async (state: z.infer<typeof customState>) => {
    let tasks: z.infer<typeof Task>[] = state.tasks || [];
    const result = await strucruedModelTasks.invoke(`
        以下の#目標 を達成するために必要な詳細タスクを出力してください。
        なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
        また、#タスクリスト を参考に重複しない内容で出力してください。

        #目標
        ${state.goals.mid_term_goal}

        #タスクリスト
        ${JSON.stringify(state.tasks)}
    `)
    tasks.push(result)

    return {
        messages: [...state.messages, { role: 'assistant', content: "タスクを設定しました。" }],
        tasks: tasks
    }
}

const createLongTermTasks = async (state: z.infer<typeof customState>) => {
    let tasks: z.infer<typeof Task>[] = state.tasks || [];
    const result = await strucruedModelTasks.invoke(`
        以下の#目標 を達成するために必要な詳細タスクを出力してください。
        なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
        また、#タスクリスト を参考に重複しない内容で出力してください。

        #目標
        ${state.goals.long_term_goal}

        #タスクリスト
        ${JSON.stringify(state.tasks)}
    `)
    tasks.push(result)

    return {
        messages: [...state.messages, { role: 'assistant', content: "タスクを設定しました。" }],
        tasks: tasks
    }
}

const judgeTask = async (state: z.infer<typeof customState>) => {
    const judge = await strucruedModelJudge.invoke(`
        以下の#目標 を達成するための#タスクリスト として必要十分なものになっているかを判断しなさい。
        必要十分だと判断した場合はtrue、そうでない場合はfalseを返してください。
        またタスクリストが5件を超過している場合はtrueを返してください。

        #目標
        ${state.goals.short_term_goal}

        #タスクリスト
        ${JSON.stringify(state.tasks)}
        `)
    console.log(`judge: ${judge.is_sufficient}`)
    if (judge.is_sufficient) {
        return END
    } else {
        return "createShortTermTasks"
    }
}

export const workflow = new StateGraph(customState)
    .addNode('chat', chatNode)
    .addNode('createShortTermTasks', createShortTermTasks)
    // .addNode('createMidTermTasks', createMidTermTasks)
    // .addNode('createLongTermTasks', createLongTermTasks)
    .addEdge(START, 'chat')
    .addEdge('chat', 'createShortTermTasks')
    .addConditionalEdges(
        'createShortTermTasks',  // 起点ノード
        judgeTask,      // 条件関数（文字列ではなく関数そのもの）
        {
            "__end__": END,              // ENDの場合
            "createShortTermTasks": "createShortTermTasks"  // ループバック
        }
    )
    .addEdge('createShortTermTasks', END)
    .compile()

// const result = await workflow.invoke({ messages: [{ role: 'user', content: '3ヶ月後に英語で会話できるようになりたい。' }] })
// console.log(result)

// import dotenv from "dotenv";
// dotenv.config();

// import * as z from "zod";
// import { StateGraph, START, END } from "@langchain/langgraph";
// import { MessagesZodMeta } from "@langchain/langgraph";
// import { registry } from "@langchain/langgraph/zod";
// import { type BaseMessage } from "@langchain/core/messages";
// import { ChatOpenAI } from "@langchain/openai";

// const Goals = z.object({
//     short_term_goal: z.string().describe("短期的な目標を出力する"),
//     mid_term_goal: z.string().describe("中期的な目標を出力する"),
//     long_term_goal: z.string().describe("長期的な目標を出力する"),
// })

// const Task = z.object({
//     goal: z.string().describe("タスクの目標を出力する"),
//     name: z.string().describe(`
//         タスクの名前を出力する。
//         タスクの名前は、タスクの内容を端的に表したものとすること。
//         なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
//         `),
//     description: z.string().describe(`
//         タスクの説明を出力する。
//         なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
//         また、タスクは複数個設定するため、単一のタスクで全て網羅する必要はありません。`),
//     priority: z.string().describe("タスクの優先度を出力する"),
//     due_date: z.string().describe("タスクの期限を出力する"),
// })

// const judgeD = z.object({
//     is_sufficient: z.boolean().describe("タスクが十分かどうかを判断する")
// })

// const customState = z.object({
//     messages: z.array(
//         z.object({
//             role: z.string(),
//             content: z.string()
//         })
//     ),
//     goals: Goals,
//     shortTermTasks: z.array(Task).default([]),
//     midTermTasks: z.array(Task).default([]),
//     longTermTasks: z.array(Task).default([]),
//     tasks: z.array(Task).default([]),  // 最終的に統合されるタスク
//     shortTermComplete: z.boolean().default(false),
//     midTermComplete: z.boolean().default(false),
//     longTermComplete: z.boolean().default(false),
// })

// const model = new ChatOpenAI({
//     model: "gpt-5-nano",
// })

// const strucruedModel = model.withStructuredOutput(Goals);
// const strucruedModelTasks = model.withStructuredOutput(Task);
// const strucruedModelJudge = model.withStructuredOutput(judgeD);

// const chatNode = async (state: z.infer<typeof customState>) => {
//     const result = await strucruedModel.invoke(state.messages)
//     return {
//         messages: [...state.messages, { role: 'assistant', content: "目標を設定しました。" }],
//         goals: result,
//         shortTermTasks: [],
//         midTermTasks: [],
//         longTermTasks: [],
//         tasks: [],
//         shortTermComplete: false,
//         midTermComplete: false,
//         longTermComplete: false,
//     }
// }

// const createShortTermTasks = async (state: z.infer<typeof customState>) => {
//     const result = await strucruedModelTasks.invoke(`
//         以下の#目標 を達成するために必要な詳細タスクを出力してください。
//         なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
//         また、#既存タスクリスト を参考に重複しない内容で出力してください。

//         #目標
//         ${state.goals.short_term_goal}

//         #既存タスクリスト
//         ${JSON.stringify(state.shortTermTasks)}
//     `)

//     return {
//         shortTermTasks: [...state.shortTermTasks, { ...result, goal: state.goals.short_term_goal }]
//     }
// }

// const createMidTermTasks = async (state: z.infer<typeof customState>) => {
//     const result = await strucruedModelTasks.invoke(`
//         以下の#目標 を達成するために必要な詳細タスクを出力してください。
//         なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
//         また、#既存タスクリスト を参考に重複しない内容で出力してください。

//         #目標
//         ${state.goals.mid_term_goal}

//         #既存タスクリスト
//         ${JSON.stringify(state.midTermTasks)}
//     `)

//     return {
//         midTermTasks: [...state.midTermTasks, { ...result, goal: state.goals.mid_term_goal }]
//     }
// }

// const createLongTermTasks = async (state: z.infer<typeof customState>) => {
//     const result = await strucruedModelTasks.invoke(`
//         以下の#目標 を達成するために必要な詳細タスクを出力してください。
//         なお、タスクはユーザーが行動に落とし込みやすいようできるだけ具体的かつ小さな単位にしてください。
//         また、#既存タスクリスト を参考に重複しない内容で出力してください。

//         #目標
//         ${state.goals.long_term_goal}

//         #既存タスクリスト
//         ${JSON.stringify(state.longTermTasks)}
//     `)

//     return {
//         longTermTasks: [...state.longTermTasks, { ...result, goal: state.goals.long_term_goal }]
//     }
// }

// // 短期タスクの判定
// const judgeShortTermTask = async (state: z.infer<typeof customState>) => {
//     const judge = await strucruedModelJudge.invoke(`
//         以下の#目標 を達成するための#タスクリスト として必要十分なものになっているかを判断しなさい。
//         必要十分だと判断した場合はtrue、そうでない場合はfalseを返してください。
//         またタスクリストが5件を超過している場合はtrueを返してください。

//         #目標
//         ${state.goals.short_term_goal}
        
//         #タスクリスト
//         ${JSON.stringify(state.shortTermTasks)}
//     `)
//     console.log(`Short-term judge: ${judge.is_sufficient}, task count: ${state.shortTermTasks.length}`)

//     if (judge.is_sufficient || state.shortTermTasks.length >= 5) {
//         return "shortTermComplete"
//     } else {
//         return "createShortTermTasks"
//     }
// }

// // 中期タスクの判定
// const judgeMidTermTask = async (state: z.infer<typeof customState>) => {
//     const judge = await strucruedModelJudge.invoke(`
//         以下の#目標 を達成するための#タスクリスト として必要十分なものになっているかを判断しなさい。
//         必要十分だと判断した場合はtrue、そうでない場合はfalseを返してください。
//         またタスクリストが5件を超過している場合はtrueを返してください。

//         #目標
//         ${state.goals.mid_term_goal}
        
//         #タスクリスト
//         ${JSON.stringify(state.midTermTasks)}
//     `)
//     console.log(`Mid-term judge: ${judge.is_sufficient}, task count: ${state.midTermTasks.length}`)

//     if (judge.is_sufficient || state.midTermTasks.length >= 5) {
//         return "midTermComplete"
//     } else {
//         return "createMidTermTasks"
//     }
// }

// // 長期タスクの判定
// const judgeLongTermTask = async (state: z.infer<typeof customState>) => {
//     const judge = await strucruedModelJudge.invoke(`
//         以下の#目標 を達成するための#タスクリスト として必要十分なものになっているかを判断しなさい。
//         必要十分だと判断した場合はtrue、そうでない場合はfalseを返してください。
//         またタスクリストが5件を超過している場合はtrueを返してください。

//         #目標
//         ${state.goals.long_term_goal}
        
//         #タスクリスト
//         ${JSON.stringify(state.longTermTasks)}
//     `)
//     console.log(`Long-term judge: ${judge.is_sufficient}, task count: ${state.longTermTasks.length}`)

//     if (judge.is_sufficient || state.longTermTasks.length >= 5) {
//         return "longTermComplete"
//     } else {
//         return "createLongTermTasks"
//     }
// }

// // 完了フラグをセットするノード
// const markShortTermComplete = async (state: z.infer<typeof customState>) => {
//     console.log("Short-term tasks completed!")
//     return {
//         shortTermComplete: true
//     }
// }

// const markMidTermComplete = async (state: z.infer<typeof customState>) => {
//     console.log("Mid-term tasks completed!")
//     return {
//         midTermComplete: true
//     }
// }

// const markLongTermComplete = async (state: z.infer<typeof customState>) => {
//     console.log("Long-term tasks completed!")
//     return {
//         longTermComplete: true
//     }
// }

// // すべて完了したかチェック
// const checkAllComplete = (state: z.infer<typeof customState>) => {
//     if (state.shortTermComplete && state.midTermComplete && state.longTermComplete) {
//         return "aggregateTasks"
//     } else {
//         return "waitForCompletion"
//     }
// }

// // 待機ノード（実際には何もしない）
// const waitForCompletion = async (state: z.infer<typeof customState>) => {
//     console.log(`Waiting... Short: ${state.shortTermComplete}, Mid: ${state.midTermComplete}, Long: ${state.longTermComplete}`)
//     return {}
// }

// // 結果を統合するノード
// const aggregateTasks = async (state: z.infer<typeof customState>) => {
//     const allTasks = [
//         ...state.shortTermTasks,
//         ...state.midTermTasks,
//         ...state.longTermTasks
//     ]

//     console.log(`Total tasks created: ${allTasks.length}`)

//     return {
//         tasks: allTasks,
//         messages: [...state.messages, {
//             role: 'assistant',
//             content: `すべてのタスクを作成しました。合計${allTasks.length}個のタスクです。`
//         }]
//     }
// }

// const workflow = new StateGraph(customState)
//     .addNode('chat', chatNode)
//     .addNode('createShortTermTasks', createShortTermTasks)
//     .addNode('createMidTermTasks', createMidTermTasks)
//     .addNode('createLongTermTasks', createLongTermTasks)
//     .addNode('markShortTermComplete', markShortTermComplete)
//     .addNode('markMidTermComplete', markMidTermComplete)
//     .addNode('markLongTermComplete', markLongTermComplete)
//     .addNode('waitForCompletion', waitForCompletion)
//     .addNode('aggregateTasks', aggregateTasks)
//     .addEdge(START, 'chat')
//     .addEdge('chat', 'createShortTermTasks')
//     .addEdge('chat', 'createMidTermTasks')
//     .addEdge('chat', 'createLongTermTasks')
//     // 短期タスクのループ
//     .addConditionalEdges(
//         'createShortTermTasks',
//         judgeShortTermTask,
//         {
//             "createShortTermTasks": "createShortTermTasks",
//             "shortTermComplete": "markShortTermComplete"
//         }
//     )
//     // 中期タスクのループ
//     .addConditionalEdges(
//         'createMidTermTasks',
//         judgeMidTermTask,
//         {
//             "createMidTermTasks": "createMidTermTasks",
//             "midTermComplete": "markMidTermComplete"
//         }
//     )
//     // 長期タスクのループ
//     .addConditionalEdges(
//         'createLongTermTasks',
//         judgeLongTermTask,
//         {
//             "createLongTermTasks": "createLongTermTasks",
//             "longTermComplete": "markLongTermComplete"
//         }
//     )
//     // 完了チェック
//     .addEdge('markShortTermComplete', 'waitForCompletion')
//     .addEdge('markMidTermComplete', 'waitForCompletion')
//     .addEdge('markLongTermComplete', 'waitForCompletion')
//     .addConditionalEdges(
//         'waitForCompletion',
//         checkAllComplete,
//         {
//             "waitForCompletion": "waitForCompletion",
//             "aggregateTasks": "aggregateTasks"
//         }
//     )
//     .addEdge('aggregateTasks', END)
//     .compile()

// const result = await workflow.invoke({
//     messages: [{ role: 'user', content: '3ヶ月後に英語で会話できるようになりたい。' }]
// })
// console.log(JSON.stringify(result, null, 2))