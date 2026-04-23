export default async function handler(req, res) {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'Missing url parameter' })

  const target = decodeURIComponent(url)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  try {
    const upstream = await fetch(target, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlenumProtokoll/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timer)
    const text = await upstream.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/html; charset=utf-8')
    res.status(200).send(text)
  } catch (e) {
    clearTimeout(timer)
    res.status(502).json({ error: e.message })
  }
}
