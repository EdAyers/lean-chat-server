
import {Kafka as Kafka} from "https://deno.land/x/kafkasaur@v0.0.7/index.ts"
import { CallInfo } from "./types.ts";

const kafka = new Kafka({
    clientId: 'lean-chat-server',
    brokers: [Deno.env.get('CONFLUENT_BOOTSTRAP_SERVER')!],
    ssl: true,
    connectionTimeout: 10000,
    authenticationTimeout: 10000,
    sasl: {
        mechanism: 'plain',
        username: Deno.env.get('CONFLUENT_API_KEY')!,
        password: Deno.env.get('CONFLUENT_API_SECRET')!,
    }
})

export async function logCall(info: CallInfo) {
    try {
        await producer.connect();
        await producer.send({
            topic: 'lean-chat-call',
            messages: [{
                value: JSON.stringify(info),
                key: `${info.userId}` // [todo] what should the key be?
            }]
        })
    } catch (err) {
        console.error(`Kafka error: ${err.message}`)
    }
}

const producer = kafka.producer();

