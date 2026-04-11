const express = require('express');
const cors = require('cors');
const dxf = require('dxf');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Convert DXF to SVG endpoint
app.post('/api/convert-svg', (req, res) => {
  try {
    const dxfString = req.body.dxf;

    if (!dxfString) {
      return res.status(400).send('DXF data is missing.');
    }

    console.log("Parsing DXF...");
    const parsed = dxf.parseString(dxfString);
    
    console.log("Converting to SVG...");
    const svgString = dxf.toSVG(parsed);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgString);

  } catch (err) {
    console.error('Error converting DXF to SVG:', err);
    res.status(500).send('Internal Server Error: ' + err.message);
  }
});

app.listen(port, () => {
  console.log(`DXF Conversion Server (v2) running at http://localhost:${port}`);
});
