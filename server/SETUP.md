# travelAgent Backend - Setup Guide

## Quick Start

```bash
cd server

# Start backend server
npm start
```

Server will run on `http://localhost:3001`

## Corporate Proxy / SSL Issues

If you get SSL certificate errors when connecting to Valhalla, you likely have a corporate proxy with self-signed certificates.

### Solution 1: Use CA Certificate (Recommended)

1. Locate your company's root CA certificate (ask IT)
2. Set environment variable:
   ```bash
   export NODE_EXTRA_CA_CERTS=/path/to/root-ca.crt
   npm start
   ```

3. Or use the production start script in package.json:
   ```bash
   npm run start:prod
   # (Update the path in package.json first!)
   ```

### Solution 2: Disable TLS Verification (Development Only)

⚠️ **NOT FOR PRODUCTION** - Security risk!

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npm start
```

The `.env` file includes this setting for development.

## API Endpoints

### Route Calculation
```bash
POST http://localhost:3001/api/route
Content-Type: application/json

{
  "locations": [
    {"lat": 48.7758, "lon": 9.1829},
    {"lat": 48.8961, "lon": 9.1899}
  ],
  "costing": "bicycle"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "trip": {
      "legs": [...],
      "summary": {
        "length": 15.709,
        "time": 3357.744
      }
    }
  },
  "meta": {...},
  "timestamp": "2026-03-02T..."
}
```

### Health Check
```bash
GET http://localhost:3001/health
```

## Running Tests

```bash
NODE_OPTIONS=--experimental-vm-modules npm test
```

## Troubleshooting

### "self-signed certificate in certificate chain"
- This is the corporate proxy SSL issue
- Use Solution 1 or 2 above

### Valhalla API returns 404
- Check if the Valhalla API endpoint is correct
- Verify network connectivity to https://valhalla1.openstreetmap.de

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| VALHALLA_API_URL | https://valhalla1.openstreetmap.de | Valhalla API endpoint |
| NODE_TLS_REJECT_UNAUTHORIZED | 0 | Disable SSL verification (dev only) |
| NODE_EXTRA_CA_CERTS | (unset) | Path to root CA certificate (recommended) |

See `.env` file for current settings.
