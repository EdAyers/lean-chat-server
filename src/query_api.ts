import { promptOfNlStatement, promptOfResponse, EXAMPLE_PROMPT } from "./prompting.ts";
import { Configuration, OpenAIApi } from "openai";
import { Bubble, ChatRequest } from "./types.ts";

export async function getCompletionOfPrompt(
    openai: OpenAIApi,
    prompt: string,
    _user: string, // [todo] where is user id passed to openai?
    model = "code-davinci-002",
    temperature = 0,
    max_tokens = 150,
    stop = ":=") {
    const response = await openai.createCompletion({
        model, prompt, max_tokens, temperature, stop,
    })
    return response.data.choices[0].text
}

export async function isSafeOfResponse(
    openai: OpenAIApi,
    response: string
) {
    const threshold = -0.355;
    const prompt = `<|endoftext|>${response}\n--\nLabel:`;
    const output = await openai.createCompletion({
        model: "content-filter-alpha",
        prompt: prompt,
        max_tokens: 1,
        temperature: 0.0,
        top_p: 0.0,
        logprobs: 10,
    })
    const result = output.data.choices[0]
    const _token = result.text
    const logprob = result.logprobs.top_logprobs[0]["2"]
    if (result.text === "2" && logprob < threshold) {
        return true
    } else {
        return false
    }
}


export async function runExample(key: string) {
    const openai = new OpenAIApi(new Configuration({ apiKey: key }))
    const resp = await getCompletionOfPrompt(openai, EXAMPLE_PROMPT, "1");
    const context = EXAMPLE_PROMPT + resp;
    console.log(EXAMPLE_PROMPT + resp)
    const suggestion = "use `order_of` instead of `order`";
    const prompt = promptOfResponse(suggestion, context);
    const final = await getCompletionOfPrompt(openai, prompt, "1");
    return prompt + final
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY}))

export async function getReply(request : ChatRequest) : Promise<Bubble>{
    if (request.bubbles.length === 0) {
        throw new Error('Need at least one bubble');
    }
    const [inputBubble] = request.bubbles.slice(-1)
    if (inputBubble.user === 'codex') {
        throw new Error('Expecting last bubble in the sequence to not be a codex bubble.')
    }
    const inputText = inputBubble.plaintext
    const contextBubbles = request.bubbles.slice(0, -1)

    const userid = request.session.account.id
    let prompt : string;
    if (contextBubbles.length !== 0) {
        const context = contextBubbles.map(x => x.plaintext).join("")
        prompt = promptOfResponse(inputText, context)
    } else {
        prompt = promptOfNlStatement(inputText)
    }
    const response = await getCompletionOfPrompt(openai, prompt, userid)

    if (await isSafeOfResponse(openai, response)) {
        return { user: "codex", plaintext: response + ":=", type: 'code' }
    } else {
        const message = "Codex generated an unsafe output."
        throw new Error(message)
    }
}