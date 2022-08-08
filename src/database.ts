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

/** Send a POJO to a DynamoDB attribute value. */
function toPutItem(v: any) : any {
    if (typeof v === 'string') {
        return {S: v}
    } else if (typeof v === 'number') {
        return {N: String(v)}
    } else if (typeof v === 'boolean') {
        return {B: v}
    } else if (v instanceof Date) {
        return {S: v.toISOString()}
    } else if (v instanceof Array) {
        return {L: v.map(toPutItem)}
    } else if (v?.constructor === Object) {
        const r : any = {}
        for (const k of Object.getOwnPropertyNames(v)) {
            const vk = v[k]
            if (vk === undefined || vk === null) {
                continue
            }
            r[k] = toPutItem(vk)
        }
        return {M: r}
    } else {
        throw new Error(`Unsupported value ${v} : ${typeof v}.`)
    }
}

async function put(row : any, tablename = 'lean-chat') : Promise<void> {
    const item : any = {}
    for (const k of Object.getOwnPropertyNames(row)) {
        const v = row[k]
        if (v === undefined || v === null) {
            continue
        }
        item[k] = toPutItem(v)
    }
    if (!item.timestamp) {
        item.timestamp = toPutItem(new Date(Date.now()))
    }
    const result = await client.send(new PutItemCommand({
        TableName: tablename,
        Item: item
    }));
    const status = result.$metadata.httpStatusCode;
    if (status !== 200) {
        throw new Error(`Dynamo returned status ${status}`);
    }
}

export async function logCall(info: CallInfo) {
    try {
        const row = {
            kind: 'chat',
            inputText: info.inputText,
            userId: String(info.userId),
            id: info.responseId,
            response_plaintext: info.response.plaintext,
            bubbles: JSON.stringify(info.bubbles),
            sessionId: info.sessionId,
            DENO_DEPLOYMENT_ID: info.DENO_DEPLOYMENT_ID,
        }
        await put(row)
    } catch (error) {
        console.error('error in logCall')
        console.error(error)
    }
}

export async function logRating(info: RatingRequest & {user: {id, login, email}}) {
    // validation
    if (info.responseId === undefined) {
        throw new Error(`Expected responseId field.`)
    }
    if ((info.comment === undefined) && (info.val === undefined)) {
        throw new Error('A rating needs either a comment or val field.')
    }
    if (info.val !== undefined) {
        if (![1, 0, -1].includes(info.val)) {
            throw new Error(`val field must be 1, 0, or -1`)
        }
    }

    try {
        await put({
            kind: 'rating',
            userId: String(info.user.id),
            responseId: String(info.responseId),
            id: crypto.randomUUID(),
            comment: info.comment,
            val: info.val,
        })
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
    const val = info.rate ? { yes: 1, no: -1 }[info.rate] : 0
    if (val === undefined) {
        throw new Error(`Invalid rate field ${info.rate}`)
    }
    try {
        await put({
            id: crypto.randomUUID(),
            digest: String(info.digest),
            kind: 'docgen-rating',
            val,
            decl: info.decl,
            statement: info.statement,
            edit: info.edit,
        })
        console.log(`decl: ${info.decl}  rate: ${info.rate}\nedit: ${info.edit ?? 'none'}`)
    } catch (error) {
        console.error(error)
    }
}