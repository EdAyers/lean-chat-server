// following this tutorial:
// https://deno.com/deploy/docs/tutorial-dynamodb

// AWS has an official SDK that works with browsers. As most Deno Deploy's
// APIs are similar to browser's, the same SDK works with Deno Deploy.
// So we import the SDK along with some classes required to insert and
// retrieve data.
import { DynamoDBClient, PutItemCommand } from "https://esm.sh/@aws-sdk/client-dynamodb";
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
            inputText: { S: info.inputText },
            sessionId: { S: String(info.sessionId) },
            userId: { S: String(info.userId) },
            id: {S: String(info.responseId)},
            response_plaintext: { S: info.response.plaintext },
            bubbles: {S: JSON.stringify(info.bubbles)},
            timestamp: {S: (new Date(Date.now())).toISOString()},
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
    const item : any = {
        userId: {S: String(info.session.account.id)},
        id: {S: String(info.responseId)},
    }
    if ((info.comment === undefined) && (info.val === undefined)) {
        throw new Error('A rating needs either a comment or val field.')
    }
    if (info.comment !== undefined) {
        item.comment = {S: info.comment}
    }
    if (info.val !== undefined) {
        if (![1, 0, -1].includes(info.val)) {
            throw new Error(`val field must be 1, 0, or -1`)
        }
        item.val = {N: Number(info.val)}
    }
    try {
        const result = await client.send(
            new PutItemCommand({
                TableName: 'lean-chat-rating',
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