# Docker Valhalla Setup

## Quick Start

```bash
# Start Valhalla service
docker-compose -f docker-compose.valhalla.yml up -d

# Wait for initialization (first time: 2-5 minutes)
docker-compose -f docker-compose.valhalla.yml logs -f valhalla

# Check health
curl http://localhost:8002/health
```

## Expected Output

```json
{
  "version": "8.0.0",
  "status": "OK"
}
```

## Current Issue

The valhalla image is currently downloading and initializing. This can take 5-10 minutes on first run as it:
1. Pulls the Docker image (~800 MB)
2. Initializes Valhalla configuration
3. Downloads OSM tiles for coverage area

## Workaround (If Docker Takes Too Long)

### Option A: Mock Valhalla Service
We can create a mock HTTP server that returns test responses.

### Option B: Hybrid Approach
- Tests: Use mock server (fast, reliable)
- Development: Use Docker (when ready)
- Production: Use Docker

## Files Modified

- `.env` - Changed VALHALLA_API_URL to localhost:8002
- `docker-compose.valhalla.yml` - Configuration for Valhalla service
- `VALHALLA_SETUP.md` - This file

## Monitoring

```bash
# Check container status
docker ps | grep valhalla

# View logs
docker-compose -f docker-compose.valhalla.yml logs -f valhalla

# Test route
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{"locations":[{"lat":48.7758,"lon":9.1829},{"lat":48.8961,"lon":9.1899}],"costing":"bicycle"}'
```

## Stopping Valhalla

```bash
docker-compose -f docker-compose.valhalla.yml down
```

## Removing All Data

```bash
docker-compose -f docker-compose.valhalla.yml down -v
```
