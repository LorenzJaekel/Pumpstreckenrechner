import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Agent to bypass TLS certificate mismatch for Hoehendaten.de
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Proxy for Hoehendaten.de API to bypass CORS
  app.post("/api/proxy/hoehendaten", async (req, res) => {
    const { body } = req.body;
    
    // Try these configurations in order
    const targets = [
      { host: 'freizeitkarte-osm.de', port: 14444 },
      { host: 'api.hoehendaten.de', port: 14444 }
    ];

    const bodyString = JSON.stringify(body);
    let lastError = null;

    // 1. Try Batch Request (POST /v1/line) using native https for maximum control
    for (const target of targets) {
      try {
        console.log(`Proxying batch request to: https://${target.host}:${target.port}/v1/line`);
        
        const result = await new Promise((resolve, reject) => {
          const options = {
            hostname: target.host,
            port: target.port,
            path: '/v1/line',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Content-Length': Buffer.byteLength(bodyString),
              'User-Agent': 'curl/7.68.0',
              'Host': `api.hoehendaten.de:${target.port}`
            },
            agent: httpsAgent,
            timeout: 10000
          };

          const request = https.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
              if (response.statusCode === 200) {
                try {
                  resolve({ status: 200, data: JSON.parse(data) });
                } catch (e) {
                  resolve({ status: 200, data: data }); // Fallback if not JSON
                }
              } else {
                resolve({ status: response.statusCode, data: data });
              }
            });
          });

          request.on('error', (e) => reject(e));
          request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout'));
          });
          request.write(bodyString);
          request.end();
        }) as { status: number, data: any };

        if (result.status === 200) {
          console.log(`Batch request successful on ${target.host}`);
          return res.json(result.data);
        }
        
        console.warn(`Batch request to ${target.host} returned ${result.status}:`, result.data);
        lastError = { status: result.status, data: result.data, host: target.host };
      } catch (error: any) {
        console.error(`Batch request error on ${target.host}:`, error.message);
        lastError = { status: 500, message: error.message, host: target.host };
      }
    }

    // 2. Fallback: Individual Point Requests (GET /v1/dgm)
    if (body.Geometry && body.Geometry.Coordinates) {
      console.log("Batch endpoint failed or unsupported on all attempts. Falling back to individual point lookups...");
      const coordinates = body.Geometry.Coordinates;
      const results = [];
      
      try {
        const target = targets[0]; 
        
        for (let i = 0; i < coordinates.length; i++) {
          const [lng, lat] = coordinates[i];
          const url = `https://${target.host}:${target.port}/v1/dgm?lat=${lat}&lon=${lng}`;
          
          try {
            const response = await axios.get(url, {
              headers: { 'Accept': 'application/json' },
              httpsAgent: httpsAgent,
              timeout: 5000,
              validateStatus: () => true
            });

            if (response.status === 200) {
              const elevation = typeof response.data === 'number' ? response.data : (response.data.height || response.data.elevation || 0);
              results.push([lng, lat, elevation]);
            } else {
              results.push([lng, lat, 0]);
            }
          } catch (e) {
            results.push([lng, lat, 0]);
          }
        }

        return res.json({
          Type: "LineResponse",
          ID: body.ID,
          Geometry: {
            Type: "LineString",
            Coordinates: results
          }
        });
      } catch (fallbackError: any) {
        console.error("Fallback individual lookups failed:", fallbackError.message);
      }
    }

    res.status(lastError?.status || 500).json({ 
      error: "Failed to proxy request to all attempted endpoints and fallbacks", 
      details: lastError 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
