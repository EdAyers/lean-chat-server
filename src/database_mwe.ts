//producer example
import { Kafka } from "kafkasaur"

console.log('imported Kafka')

const kafka = new Kafka({
    clientId: 'my_mwe_client',
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

const producer = kafka.producer();

export const run = async () => {
    await producer.connect();
    await producer.send({
        topic: 'test1',
        messages: [{
            key: 'key',
            value: 'hello there',
            headers: { 'correlation-id': `${Date.now()}` }
        }]
    })
    console.log('sent message')
}
