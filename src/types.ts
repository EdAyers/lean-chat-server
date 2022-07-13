
export interface Bubble {
    user: 'codex' | 'me'
    type: 'nl' | 'code'
    plaintext: string;
}

export interface Session {
    id: string
    accessToken: string
    account: {
        id: string;
        label: string;
    }
    scopes: string[]
}

export interface ChatRequest {
    kind: 'chat'
    bubbles: Bubble[],
    inputText: string,
    session: Session
}

export interface PingRequest {
    kind: 'ping'
    session: Session
}

export type RequestJson  = ChatRequest | PingRequest