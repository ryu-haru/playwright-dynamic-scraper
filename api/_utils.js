function validateRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  if (process.env.RAPIDAPI_PROXY_SECRET) {
    const secret = req.headers['x-rapidapi-proxy-secret'];
    if (secret !== process.env.RAPIDAPI_PROXY_SECRET) {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }
  }
  return true;
}

function validateUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { validateRequest, validateUrl };
