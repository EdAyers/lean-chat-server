
import {Kafka as Kafka} from "https://deno.land/x/kafkasaur@v0.0.7/index.ts"
import { CallInfo } from "./types.ts";

let k : any = undefined

function init() {
    if (k) {
        return k
    }
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
    const producer = kafka.producer()
    k = {kafka, producer}
    return k
}


export async function logCall(info: CallInfo) {
    try {
        let {producer} = init()
        console.log('connecting')
        await producer.connect();
        console.log('sending')
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


