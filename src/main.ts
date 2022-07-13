import { serve } from "https://deno.land/std@0.142.0/http/server.ts";
import { getReply } from "./query_api.ts";
import { Bubble, RequestJson, Session } from './types.ts'

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

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
}

/** This returns the thing for the CORS preflight check.
 *  This code should be removed eventually by using a proper framework, more of a learning excercise for CORS.
 */
function handleCors(req: Request) {
    return new Response(null, {
        status: 204,
        headers: CORS
    })
}

const sessionsCache = new Map<string, Session & { email: string }>()

async function handle(req: Request) {
    if (req.method === "OPTIONS") {
        return handleCors(req);
    }
    try {
        const r: RequestJson = await req.json()
        if (!r.kind) {
            throw new Error(`Accepted kinds are 'ping' and 'chat'`);
        }
        const access_token = r.session.accessToken
        if (!access_token) {
            throw new Error(`Access token not provided`);
        }
        if (!sessionsCache.has(access_token)) {
            const userInfo = await github(`https://api.github.com/user`, access_token)
            let email: string = userInfo.email
            if (!email) {
                const emails = await github(`https://api.github.com/user/emails`, access_token)
                email = emails.find(e => e.primary).email
            }
            if (!email) {
                throw new Error(`Failed to get an email address for user.`)
            }
            console.log(`New session:\n  user: ${r.session.account.label}\n  email: ${email}`);
            sessionsCache.set(access_token, { ...r.session, email })
            // we don't actually need your email,
            // I am just doing this to prove to myself that it actually authenticated.
        }
        if (r.kind === 'chat') {
            const newBubble: Bubble = await getReply(r)
            return Response.json({ newBubble }, {headers: CORS})
        } else if (r.kind === 'ping') {
            return Response.json({ email: sessionsCache.get(access_token)!.email }, {headers: CORS})
        } else {
            throw new Error(`Unrecognised kind ${(r as any).kind}.`)
        }

    } catch (err) {
        return new Response(`request error: ${err.message}`, { status: 500, headers: CORS })
    }
}