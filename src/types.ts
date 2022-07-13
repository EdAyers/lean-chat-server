
export interface Bubble {
    user: 'codex' | 'me'
    type: 'nl' | 'code'
    plaintext: string;
}

export interface ChatRequest {
    bubbles: Bubble[],
    inputText: string,
    session: {
        id: string
        accessToken: string
        account: {
            id: string;
            label: string;
        }
        scopes: string[]
    }
}

