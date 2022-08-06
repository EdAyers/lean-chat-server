// following this tutorial:
// https://deno.com/deploy/docs/tutorial-dynamodb

// AWS has an official SDK that works with browsers. As most Deno Deploy's
// APIs are similar to browser's, the same SDK works with Deno Deploy.
// So we import the SDK along with some classes required to insert and
// retrieve data.
import { DynamoDBClient, PutItemCommand } from "https://esm.sh/@aws-sdk/client-dynamodb@3.131.0";
import { CallInfo, RatingRequest } from "./types.ts";

// Create a client instance by providing your region information.
// The credentials are obtained from environment variables which
// we set during our project creation step on Deno Deploy.
const client = new DynamoDBClient({
    region: Deno.env.get("AWS_REGION"),
    credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    },
});

export async function logCall(info: CallInfo) {
    try {
        const item: any = {
            kind: { S: 'chat' },
            inputText: { S: info.inputText },
            userId: { S: String(info.userId) },
            id: { S: String(info.responseId) },
            response_plaintext: { S: info.response.plaintext },
            bubbles: { S: JSON.stringify(info.bubbles) },
            timestamp: { S: (new Date(Date.now())).toISOString() },
        }
        if (info.sessionId) {
            item.sessionId =  { S: String(info.sessionId) };
        }
        if (info.DENO_DEPLOYMENT_ID) {
            item.DENO_DEPLOYMENT_ID = { S: info.DENO_DEPLOYMENT_ID }
        }
        const result = await client.send(
            new PutItemCommand({
                TableName: 'lean-chat',
                Item: item,
            })
        )
        const status = result.$metadata.httpStatusCode
        if (status !== 200) {
            throw new Error(`Dynamo returned status ${status}`)
        }
    } catch (error) {
        console.error('error in logCall')
        console.error(error)
    }
}

export async function logRating(info: RatingRequest) {
    if (info.responseId === undefined) {
        throw new Error(`Expected responseId field.`)
    }
    const id = crypto.randomUUID()
    const item: any = {
        kind: { S: 'rating' },
        userId: { S: String(info.session.account.id) },
        responseId: { S: String(info.responseId) },
        id: { S: String(id) },
        timestamp: { S: (new Date(Date.now())).toISOString() },
    }
    if ((info.comment === undefined) && (info.val === undefined)) {
        throw new Error('A rating needs either a comment or val field.')
    }
    if (info.comment !== undefined) {
        item.comment = { S: info.comment }
    }
    if (info.val !== undefined) {
        if (![1, 0, -1].includes(info.val)) {
            throw new Error(`val field must be 1, 0, or -1`)
        }
        item.val = { N: String(info.val) }
    }
    try {
        const result = await client.send(
            new PutItemCommand({
                TableName: 'lean-chat',
                Item: item
            })
        )
        const status = result.$metadata.httpStatusCode
        if (status !== 200) {
            throw new Error(`Dynamo returned status ${status}`)
        }
    } catch (error) {
        console.error(error)
    }
}

interface DocGenRating {
    digest: string;
    rate?: 'yes' | 'no'
    edit?: string;
    decl: string;
    statement: string;
}

export async function logDocGenRating(info: DocGenRating) {
    try {
        const val = info.rate ? { yes: 1, no: -1 }[info.rate] : 0
        const id = crypto.randomUUID()
        const item: any = {
            id: { S: String(id) },
            digest: {S: String(info.digest)},
            kind: { S: 'docgen-rating' },
            timestamp: { S: (new Date(Date.now())).toISOString() },
            val: { N: String(val) },
            decl: {S: info.decl},
            statement: {S: info.statement}
        }
        if (info.edit) {
            item.edit = { S: String(info.edit) }
        }
        const result = await client.send(
            new PutItemCommand({
                TableName: 'lean-chat',
                Item: item
            })
        )
        const status = result.$metadata.httpStatusCode
        if (status !== 200) {
            throw new Error(`Dynamo returned status ${status}`)
        } else {
            console.log(`decl: ${info.decl}  rate: ${info.rate}\nedit: ${info.edit ?? 'none'}`)
        }
    } catch (error) {
        console.error(error)
    }
}