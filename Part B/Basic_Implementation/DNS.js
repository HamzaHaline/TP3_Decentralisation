const express = require('express');
const app = express();
const PORT = 3002;

app.get('/getServer', (req, res) => {
  res.json({ code: 200, server: `localhost:${PORT}` });
});

app.listen(PORT, () => {
  console.log(`DNS registry server is running on port ${PORT}`);
});
