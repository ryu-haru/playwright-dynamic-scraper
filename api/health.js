const { validateRequest } = require('./_utils');

module.exports = (req, res) => {
  if (!validateRequest(req, res)) return;
  res.json({ status: 'ok', ts: Date.now() });
};
