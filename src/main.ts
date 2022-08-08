import { serve } from "https://deno.land/std@0.142.0/http/server.ts";
import { getReply } from "./query_api.ts";
import { Bubble, RequestJson, Session } from './types.ts'
import { logCall, logDocGenRating, logRating } from './database.ts'
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

/** CORS headers for docgen. */
const CORS_DOCGEN = {
    // "Access-Control-Allow-Origin": "leanprover-community.github.io",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
}

/** This returns the thing for the CORS preflight check.
 *  This code should be removed eventually by using a proper webserver framework.
 */
function handleCors(_req: Request) {
    return new Response(null, {
        status: 204,
        headers: CORS
    })
}

const sessionsCache = new Map<string, { email: string, id: string, login: string }>()

async function handle(req: Request) {
    const url = new URL(req.url)
    if (url.pathname === '/doc-gen') {
        // validation
        const required = ['decl', 'statement', 'digest']
        for (const r of required) {
            if (!url.searchParams.has(r)) {
                return new Response(`Missing param ${r}`, {status: 400, headers: CORS_DOCGEN})
            }
        }
        if (!url.searchParams.has('rate') && !url.searchParams.has('edit')) {
            return new Response(`One param of 'rate' or 'edit' is required.`, {status: 400, headers: CORS_DOCGEN})
        }

        await logDocGenRating({
            digest: url.searchParams.get('digest')!,
            rate: url.searchParams.get('rate') as any,
            edit: url.searchParams.get('edit')!,
            statement: url.searchParams.get('statement')!,
            decl: url.searchParams.get('decl')!,
        })
        return new Response(null, {status: 204, headers: CORS_DOCGEN})
    }

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
            const id: string = userInfo.id
            if (id !== r.session.account.id) {
                console.warn(`Request id ${r.session.account.id} does not match actual id ${id}`);
            }
            if (!email) {
                const emails = await github(`https://api.github.com/user/emails`, access_token)
                email = emails.find(e => e.primary).email
            }
            if (!email) {
                throw new Error(`Failed to get an email address for user.`)
            }
            console.log(`New session:\n  user: ${userInfo.login}\n  email: ${email}\n     id: ${id}`);
            sessionsCache.set(access_token, { email, id, login: userInfo.login })
        }
        const user = sessionsCache.get(access_token)!
        if (r.kind === 'chat') {
            const newBubble: Bubble = await getReply(r)
            const responseId = crypto.randomUUID()
            newBubble.id = responseId
            await logCall({
                inputText: r.inputText,
                bubbles: r.bubbles,
                sessionId: r.session.id,
                userId: user.id,
                responseId,
                response: newBubble,
                DENO_DEPLOYMENT_ID: Deno.env.get('DENO_DEPLOYMENT_ID') ?? undefined
            });
            return Response.json({ newBubble }, {headers: CORS})
        } else if (r.kind === 'ping') {
            return Response.json({ email: sessionsCache.get(access_token)!.email }, {headers: CORS})
        } else if (r.kind === 'rating') {
            await logRating({...r, user})
            return Response.json({ message: 'thanks for your feedback!' }, {headers: CORS})
        } else {
            throw new Error(`Unrecognised kind ${(r as any).kind}.`)
        }

    } catch (err) {
        return new Response(`request error: ${err.message}`, { status: 500, headers: CORS })
    }
}