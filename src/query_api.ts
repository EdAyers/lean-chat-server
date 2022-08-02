import "https://deno.land/x/xhr@0.1.0/mod.ts"; // https://github.com/denoland/deno/discussions/15040
import { promptOfNlStatement, promptOfResponse, EXAMPLE_PROMPT } from "./prompting.ts";
import oai from "https://esm.sh/openai@3";
import { Bubble, ChatRequest } from "./types.ts";

const Configuration = oai.Configuration

export async function getCompletionOfPrompt(
    openai: oai.OpenAIApi,
    prompt: string,
    _user: string, // [todo] where is user id passed to openai?
    model = "code-davinci-002",
    temperature = 0,
    max_tokens = 150,
    stop = ":="): Promise<string> {
    const response = await openai.createCompletion({
        model, prompt, max_tokens, temperature, stop,
    })
    if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('OpenAI did not give any choices.')
    }
    const result = response.data.choices[0].text
    if (result === undefined) {
        throw new Error('OpenAI gave an undefined answer.')
    }
    return result
}

export async function assertSafeResponse(
    response : string
) {
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/json')
    myHeaders.append('Authorization', 'Bearer ' + OPENAI_API_KEY)

    const body = {input: response}

    const myInit = {
        method: 'POST',
        body: JSON.stringify(body),
        headers: myHeaders
    }

    const myRequest = new Request('https://api.openai.com/v1/moderations')

    const resp = await fetch(myRequest, myInit)
    const resp_json : OpenAIModeration = await resp.json()
    const result = resp_json.results[0]

    if (result.flagged) {
        const badness = Object.getOwnPropertyNames(result.categories).filter(k => Boolean(result.categories[k]))
        throw new Error(`Codex produced content flagged as ${badness.join(", ")}`)
    }
}

type OpenAIModerationCategories = "hate" | "hate/threatening" | "self-harm" | "sexual" | "sexual/minors" | "violence" | "violence/graphic"

interface OpenAIModeration {
    id: string;
    model: string;
    results: [{
        categories: {[cat in OpenAIModerationCategories]: 0 | 1 | boolean};
        category_scores: {[cat in OpenAIModerationCategories]: number};
        flagged: 0 | 1 | boolean;
    }]
}


export async function runExample(key: string) {
    const openai = new oai.OpenAIApi(new Configuration({ apiKey: key }))
    const resp = await getCompletionOfPrompt(openai, EXAMPLE_PROMPT, "1");
    const context = EXAMPLE_PROMPT + resp;
    console.log(EXAMPLE_PROMPT + resp)
    const suggestion = "use `order_of` instead of `order`";
    const prompt = promptOfResponse(suggestion, context);
    const final = await getCompletionOfPrompt(openai, prompt, "1");
    return prompt + final
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const openai = new oai.OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY }))

export async function getReply(request: ChatRequest): Promise<Bubble> {
    const inputText = request.inputText
    const contextBubbles = request.bubbles

    await assertSafeResponse(inputText)

    const userid = request.session.account.id
    let prompt: string;
    if (contextBubbles.length !== 0) {
        const context = contextBubbles.map(x => x.plaintext).join("")
        prompt = promptOfResponse(inputText, context)
    } else {
        prompt = promptOfNlStatement(inputText)
    }
    const response = await getCompletionOfPrompt(openai, prompt, userid)

    await assertSafeResponse(response)

    return { user: "codex", plaintext: response + ":=", type: 'code' }
}