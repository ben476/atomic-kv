# Cloudflare Workers Atomic KV

Use Durable Objects to make your changes atomic, and then push them to regular
KV to make reads fast and scalable.

While a good idea in theory, this implementation is a pain to use. Many features
like a GUI that come with regular KV won't here, although you can implement this
yourself with the authenticated REST API included.

This also support editing a specific key in a JSON value.

### Example usage to get key `foo` in namespace `KV`

```
let objId = ATOMIC_KV.idFromName('KV')
const storage = await ATOMIC_KV.get(objId)
const req = await storage.fetch('http://AtomicKV/KV/foo')
const data = await req.json()
```

### Example usage to get key `id` from JSON `foo` in namespace `KV`

```
let objId = ATOMIC_KV.idFromName('KV')
const storage = await ATOMIC_KV.get(objId)
const req = await storage.fetch('http://AtomicKV/KV/foo/id')
const data = await req.json()
```

### Example usage to delete a key

```
let objId = ATOMIC_KV.idFromName('KV')
const storage = await ATOMIC_KV.get(objId)
const resp = await storage.fetch('http://AtomicKV/KV/foo', {
    method: 'DELETE'
})
```
