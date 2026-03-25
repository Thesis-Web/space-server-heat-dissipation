'use strict';

const express = require('express');
const path = require('path');
const { executeRunPacket } = require('./dist/runtime/runner/run-packet');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'ui/app')));

app.post('/api/run-packet', async (req, res) => {
  try {
    const result = executeRunPacket(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    const message = (err && err.message) ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('Orbital Thermal Trade System running on http://localhost:' + PORT);
});
