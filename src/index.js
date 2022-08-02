export { AtomicKV } from "./AtomicKV.js"
import authenticate from "./auth.js"

export default {
  async fetch(request, env) {
    const user = await authenticate(request, env)

    if (!user || !user.roles.includes("kv:write")) {
      return new Response('Unauthorized', { status: 401 })
    }

    const url = new URL(request.url)

    const params = url.pathname.split('/')
    params.shift()
    const namespace = params[0]

    let id = env.ATOMIC_KV.idFromName(namespace)

    const storage = await env.ATOMIC_KV.get(id)

    return storage.fetch(request)
  }
}