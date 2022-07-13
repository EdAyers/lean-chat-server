import { serve } from "https://deno.land/std@0.142.0/http/server.ts";
import { getReply } from "./query_api.ts";
import { Bubble, ChatRequest } from './types.ts'
// import { Octokit, App } from "https://cdn.skypack.dev/octokit?dts";

// const client_id = Deno.env.get('CLIENT_ID')
// const client_secret = Deno.env.get('CLIENT_SECRET')
// const openai_api_key = Deno.env.get('OPENAI_API_KEY')

serve(handle)

async function github(url, access_token) {
    const r = await fetch(url, {
        headers: {
            Authorization: `token ${access_token}`
        }
    })
    return await r.json()
}

/** This returns the thing for the CORS preflight check.
 *  This code should be removed eventually by using a proper framework, more of a learning excercise for CORS.
 */
function handleCors(req: Request) {
    console.log("Headers:", req.headers);
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
        }
    })
}

async function handle(req: Request) {
    if (req.method === "OPTIONS") {
        return handleCors(req);
    }
    try {
        const r : ChatRequest = await req.json()
        console.log(`Got session for user ${r.session.account.label}`)
        const access_token = r.session.accessToken
        const userInfo = await github(`https://api.github.com/user`, access_token)
        console.log(`Got response ${JSON.stringify(userInfo)}`)
        let email: string = userInfo.email
        if (!email) {
            const emails = await github(`https://api.github.com/user/emails`, access_token)
            console.log(`Got emails ${JSON.stringify(emails)}`)
            email = emails.find(e => e.primary).email
        }
        // we don't actually need your email,
        // I am just doing this to prove to myself that it actually authenticated.

        const newBubble : Bubble = await getReply(r)
        return Response.json({ email, newBubble }, {
            headers: {
                "Access-Control-Allow-Origin": "*",
            }
        })
    } catch (err) {
        return new Response(`bad request: ${err.message}`, { status: 400 })
    }
}