var signingKey

async function getSigningKey(SIGNING_PUBLIC_KEY) {
    // TODO: needs rate limiting

    if (signingKey) return signingKey

    signingKey = crypto.subtle.importKey(
        'jwk',
        JSON.parse(SIGNING_PUBLIC_KEY),
        {
            name: 'ECDSA',
            namedCurve: 'P-256',
        },
        false,
        ['verify'],
    )

    return signingKey
}

export default async function authenticate(request, env) {
    const token = request.headers.get('Authorization')?.substring(6)

    if (!token) return null

    const [rawHeader, rawPayload, rawSignature] = token.trim().split('.')

    // ID of the key that was used to sign the JWT
    const key = await getSigningKey(env.SIGNING_PUBLIC_KEY)

    let signature = atob(rawSignature.replace(/_/g, '/').replace(/-/g, '+'))
    signature = new Uint8Array(Array.from(signature).map((c) => c.charCodeAt(0)))

    const content = new TextEncoder().encode([rawHeader, rawPayload].join('.'))

    const payload = JSON.parse(atob(rawPayload))

    console.log(payload)
    console.log(payload.roles)

    if (
        !(
            (await crypto.subtle.verify(
                { name: 'ECDSA', hash: 'SHA-256' },
                key,
                signature,
                content,
            )) &&
            payload.iss === env.ISSUER &&
            payload.aud.includes('admin') &&
            payload.exp > Date.now() / 1000
        )
    ) {
        console.log(
            'death',
            await crypto.subtle.verify(
                { name: 'ECDSA', hash: 'SHA-256' },
                key,
                signature,
                content,
            ),
            payload.iss === env.ISSUER,
            payload.aud.includes('admin'),
            payload.exp > Date.now() / 1000,
        )
        return null
    }
    return payload
}