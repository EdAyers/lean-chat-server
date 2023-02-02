
/* Mini schema validation library */

export class UnionT {
    readonly items: Schema[]
    constructor(...items: Schema[]) {
        this.items = items
    }
}

export class OptionalT {
    constructor(readonly item: Schema) { }
}

export class ListT {
    constructor(readonly item: Schema) { }
}

type Schema =
    | { [k: string]: Schema }
    | (typeof String)
    | string // literals
    | UnionT
    | Schema[] // tuple
    | OptionalT
    | ListT
// other things are possible; eg regex, where functions etc.

export function validate(item: any, schema: Schema) {
    const r = core(item, schema, [])
    if (!r) {return; }
    else {throw new Error(r)}
    function core(item : any, schema : Schema, path): string | null {
        const at = path.length === 0 ? "" : ` at ${path.join('.')}`
        if (schema === String) {
            if (typeof item !== 'string') {
                return (`Expected string${at} but got ${typeof item}: ${item}`)
            }
            return null
        } else if (typeof schema === 'string') {
            if (item !== schema) {
                return (`Expected ${schema}${at} but got ${typeof item}: ${item}`)
            }
            return null
        } else if (schema instanceof UnionT) {
            const results = schema.items.map(s => core(item, s, path))
            if (results.every(r => r)) {
                return (`Union failed${at}, expected one of the following to work:\n${results.map(r => `  ${r}`).join('\n')}`)
            } else {
                return null
            }
        } else if (schema instanceof Array) {
            if (!(item instanceof Array) || !(item.length === schema.length)) {
                return `Expected array of length ${schema.length}${at} but got ${typeof item}: ${item}`
            }
            for (let i = 0; i < schema.length; i++) {
                const r = core(item[i], schema[i], [...path, i])
                if (r) {
                    return r
                }
            }
            return null
        } else if (schema instanceof OptionalT) {
            if (item === undefined || item === null) {
                return null
            }
            return core(item, schema.item, path)
        } else if (schema instanceof ListT) {
            if (!(item instanceof Array)) {
                return `Expected array${at} but got ${typeof item}: ${item}`
            }
            for (let i = 0; i < item.length; i++) {
                const r = core(item[i], schema.item, [...path, i])
                if (r) {
                    return r
                }
            }
            return null
        } else if (schema?.constructor === Object) {
            const ks = Object.getOwnPropertyNames(schema)
            for (const k of ks) {
                const v = item[k]
                const r = core(v, schema[k], [...path, k])
                if (r) {
                    return r
                }
            }
            return null
        } else {
            throw new Error(`Unrecognised schema ${schema}${at}`)
        }
    }
}