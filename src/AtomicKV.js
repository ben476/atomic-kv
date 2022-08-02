export class AtomicKV {
    constructor(controller, env) {
        this.storage = controller.storage
        this.env = env
    }

    async fetch(request) {
        let url = new URL(request.url)
        const params = url.pathname.split('/')
        params.shift()
        const namespace = params[0]
        const key = params[1]
        const subKey = params[2]

        console.log("AtomicKV: " + namespace + " " + key + " " + subKey, this.env[namespace])

        if (!namespace || !key) {
            return new Response('Invalid namespace or key', { status: 400 })
        }

        if (!this.env[namespace]) {
            return new Response('Namespace not found', { status: 404 })
        }

        if (subKey) {
            if (request.method.toUpperCase() === 'GET') {
                const data = await this.storage.get(key)
                if (!data) {
                    return new Response('Key not found', { status: 404 })
                }
                // console.log(typeof data, data)
                const value = JSON.parse(data)[subKey]
                return new Response(JSON.stringify(value), {
                    status: value === undefined ? 404 : 200,
                })
            }

            if (request.method.toUpperCase() === 'PUT') {
                const data = await this.storage.get(key)
                if (!data) {
                    return new Response('Key not found', { status: 404 })
                }
                const value = JSON.parse(data)
                const newValue = await request.json()
                console.log(newValue)
                value[subKey] = newValue
                await Promise.all([this.storage.put(key, JSON.stringify(value)), await this.env[namespace].put(key, JSON.stringify(value))])
                return new Response('{"status": "ok"}')
            }

            if (request.method.toUpperCase() === 'PATCH') {
                const data = await this.storage.get(key)
                if (!data) {
                    return new Response('Key not found', { status: 404 })
                }
                const value = JSON.parse(data)
                const patch = await request.json()
                console.log(patch)
                value[subKey] = { ...value[subKey], ...patch }
                await Promise.all([this.storage.put(key, JSON.stringify(value)), await this.env[namespace].put(key, JSON.stringify(value))])
                return new Response('{"status": "ok"}')
            }

            if (request.method.toUpperCase() === 'DELETE') {
                const data = await this.storage.get(key)
                if (!data) {
                    return new Response('Key not found', { status: 404 })
                }
                const value = JSON.parse(data)
                delete value[subKey]
                await Promise.all([this.storage.put(key, JSON.stringify(value)), await this.env[namespace].put(key, JSON.stringify(value))])
                return new Response('{"status": "ok"}')
            }

        } else {
            // On get
            if (request.method.toUpperCase() === 'GET') {
                const value = await this.storage.get(key)
                return new Response(value)
            }

            // On put
            if (request.method.toUpperCase() === 'PUT') {
                const value = await request.text()
                await this.storage.put(key, value)
                await this.env[namespace].put(key, value)
                return new Response(value)
            }

            // On patch
            if (request.method.toUpperCase() === 'PATCH') {
                const data = await request.json()
                const stored = await this.storage.get(key)
                console.log("Patching " + stored + " with " + JSON.stringify(data))
                if (!stored) {
                    return new Response('Key not found', { status: 404 })
                }
                const value = JSON.parse(stored)
                let newValue

                if (Array.isArray(data) && Array.isArray(value)) {
                    console.log("Patching array")
                    newValue = [...value, ...data]
                }
                else if (
                    typeof data === 'object' &&
                    !Array.isArray(data) &&
                    Array.isArray(value) &&
                    'id' in data
                ) {
                    console.log("Patching object in array")
                    newValue = value.map((a) => (a.id === data.id ? { ...a, ...data } : a))
                }
                else if (typeof data === 'object' && typeof value === 'object' && data.id) {
                    console.log("Patching object")
                    console.log("id", JSON.stringify(data.id))
                    if (value[data.id])
                        newValue = { ...value, [data.id]: { ...value[data.id], ...data } }
                    else newValue = { ...value, [data.id]: data }
                }

                console.log("New value: " + JSON.stringify(newValue))

                if (!newValue) return new Response('Invalid data', { status: 400 })

                await this.storage.put(key, JSON.stringify(newValue))
                await this.env[namespace].put(key, JSON.stringify(newValue))

                return new Response(JSON.stringify(newValue))
            }

            // On delete
            if (request.method.toUpperCase() === 'DELETE') {
                await this.storage.delete(key)
                await this.env[namespace].delete(key)
                return new Response('', { status: 204 })
            }
        }

        return new Response('Invalid method', { status: 400 })
    }
}