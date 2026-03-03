/**
 * Valhalla Service
 * Handles all communication with Valhalla API for routing and elevation
 * Includes retry logic, timeout handling, and error management
 */

// Ensure SSL environment is configured for corporate proxy compatibility
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED && process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Get VALHALLA_BASE_URL dynamically (after dotenv is loaded by server.js)
function getValhallaBaseUrl() {
  return process.env.VALHALLA_API_URL || 'https://valhalla1.openstreetmap.de';
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Calculate route between waypoints
 * @param {Array} locations - Array of {lat, lon} objects
 * @param {string} costing - Routing profile (bicycle, pedestrian, etc)
 * @param {Object} costingOptions - Additional routing options
 * @returns {Promise<Object>} Valhalla trip response
 * @throws {Error} With code property for error categorization
 */
export async function calculateRoute(locations, costing = 'bicycle', costingOptions = {}) {
  // Validate input
  if (!Array.isArray(locations) || locations.length < 2) {
    const error = new Error('Invalid locations: need at least 2 waypoints');
    error.code = 'INVALID_REQUEST';
    error.statusCode = 400;
    throw error;
  }

  if (!locations.every(loc => 
    typeof loc.lat === 'number' && 
    typeof loc.lon === 'number' &&
    !isNaN(loc.lat) && 
    !isNaN(loc.lon)
  )) {
    const error = new Error('Invalid location format: each must have numeric lat and lon');
    error.code = 'INVALID_REQUEST';
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    locations,
    costing,
    costing_options: costingOptions || {},
    shape_match: 'map_snap'
  };

  console.log(`[Valhalla] Calculating route with ${locations.length} waypoints, profile: ${costing}`);

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${getValhallaBaseUrl()}/route`,
        payload,
        TIMEOUT_MS
      );
      
      console.log(`[Valhalla] Route calculated successfully on attempt ${attempt}`);
      console.log(`[Valhalla] Got ${response.trip?.legs?.[0]?.shape?.length || 0} geometry points`);
      
      return response;
    } catch (error) {
      console.error(
        `[Valhalla] Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`
      );

      // If last attempt, throw
      if (attempt === MAX_RETRIES) {
        error.code = error.code || 'VALHALLA_ERROR';
        error.statusCode = error.statusCode || 503;
        throw error;
      }

      // Exponential backoff
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`[Valhalla] Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * Get elevation data for a route using Open-Elevation API
 * @param {string} polylineEncoded - Encoded polyline from Valhalla
 * @returns {Promise<Object>} Elevation data with statistics
 */
export async function getElevationProfile(polylineEncoded) {
  if (!polylineEncoded || typeof polylineEncoded !== 'string') {
    const error = new Error('Invalid polyline: must be non-empty string');
    error.code = 'INVALID_REQUEST';
    error.statusCode = 400;
    throw error;
  }

  console.log(`[Elevation] Processing polyline for elevation data`);

  try {
    // Import decoder utilities
    const { decodePolyline, samplePointsByDistance } = await import('../utils/polylineDecoder.js');

    // 1. Decode full polyline geometry
    const allPoints = decodePolyline(polylineEncoded);
    if (allPoints.length === 0) {
      throw new Error('Failed to decode polyline');
    }
    console.log(`[Elevation] Decoded ${allPoints.length} points from polyline (FULL geometry)`);

    // 2. Sample points every 50m for elevation lookup (API efficiency)
    const sampleDistance = parseInt(process.env.ELEVATION_SAMPLE_DISTANCE_M || '50');
    const sampledPoints = samplePointsByDistance(allPoints, sampleDistance);
    const sampledIndices = [];
    
    // Build map of sampled point indices
    let sampledIdx = 0;
    for (let i = 0; i < allPoints.length; i++) {
      if (sampledIdx < sampledPoints.length) {
        const sp = sampledPoints[sampledIdx];
        const cp = allPoints[i];
        // Check if point matches sampled point (with tolerance)
        if (Math.abs(sp.lat - cp.lat) < 0.0001 && Math.abs(sp.lon - cp.lon) < 0.0001) {
          sampledIndices.push(i);
          sampledIdx++;
        }
      }
    }
    
    console.log(`[Elevation] Sampled ${sampledIndices.length} points for API lookup (${sampleDistance}m intervals)`);

    // 3. Request elevation for sampled points only
    const elevationResponse = await fetchWithTimeout(
      process.env.OPEN_ELEVATION_API_URL || 'https://api.open-elevation.com/api/v1/lookup',
      {
        locations: sampledPoints.map(p => ({ latitude: p.lat, longitude: p.lon }))
      },
      TIMEOUT_MS
    );

    if (!elevationResponse.results || !Array.isArray(elevationResponse.results)) {
      throw new Error('Invalid elevation response format');
    }

    // 4. Build full elevation array by interpolating
    const sampledElevations = elevationResponse.results.map(r => r.elevation);
    const fullElevations = new Array(allPoints.length);
    
    // Populate sampled points first
    for (let i = 0; i < sampledIndices.length; i++) {
      fullElevations[sampledIndices[i]] = sampledElevations[i];
    }
    
    // Interpolate remaining points
    for (let i = 0; i < fullElevations.length; i++) {
      if (fullElevations[i] === undefined) {
        // Find nearest sampled indices (before and after)
        let beforeIdx = -1;
        let afterIdx = -1;
        
        for (let j = 0; j < sampledIndices.length; j++) {
          if (sampledIndices[j] < i) {
            beforeIdx = j;
          } else if (sampledIndices[j] > i) {
            afterIdx = j;
            break;
          }
        }
        
        if (beforeIdx === -1) {
          // Before first sample
          fullElevations[i] = sampledElevations[0];
        } else if (afterIdx === -1) {
          // After last sample
          fullElevations[i] = sampledElevations[sampledElevations.length - 1];
        } else {
          // Linear interpolation
          const i1 = sampledIndices[beforeIdx];
          const i2 = sampledIndices[afterIdx];
          const e1 = sampledElevations[beforeIdx];
          const e2 = sampledElevations[afterIdx];
          const ratio = (i - i1) / (i2 - i1);
          fullElevations[i] = e1 + (e2 - e1) * ratio;
        }
      }
    }
    
    console.log(`[Elevation] Interpolated to ${fullElevations.length} points (100% coverage)`);
    
    const stats = calculateElevationStats(fullElevations);
    console.log(`[Elevation] Retrieved elevation data: gain ${stats.elevation_gain}m, loss ${stats.elevation_loss}m`);

    return {
      elevation: fullElevations,
      elevation_gain: stats.elevation_gain,
      elevation_loss: stats.elevation_loss,
      min_elevation: stats.min_elevation,
      max_elevation: stats.max_elevation,
      avg_elevation: stats.avg_elevation,
      sampled_points: sampledIndices.length
    };
  } catch (error) {
    console.error(`[Elevation] Error retrieving elevation data: ${error.message}`);
    console.error(`[Elevation] Stack: ${error.stack}`);

    // Graceful degradation
    console.warn('[Elevation] Returning zero elevations (service unavailable)');
    return {
      elevation: [],
      elevation_gain: 0,
      elevation_loss: 0,
      min_elevation: 0,
      max_elevation: 0,
      avg_elevation: 0,
      sampled_points: 0
    };
  }
}

/**
 * Fetch with timeout wrapper
 * @private
 */
async function fetchWithTimeout(url, payload, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // For HTTPS URLs (like Valhalla), we need to handle self-signed certificates
    // This is common in corporate/offline environments
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      timeout: timeoutMs
    };

    // Add HTTPS agent for self-signed certs if using https
    if (url.startsWith('https://')) {
      const https = await import('https');
      fetchOptions.agent = new https.Agent({
        rejectUnauthorized: false  // Allow self-signed certificates
      });
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = response.statusText;
      }

      const error = new Error(
        `Valhalla returned ${response.status}: ${errorText || 'Unknown error'}`
      );
      error.statusCode = response.status >= 500 ? 503 : response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error(`Network error: ${error.message}`);
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Calculate elevation statistics from elevation array
 * @private
 */
function calculateElevationStats(elevations) {
  if (!Array.isArray(elevations) || elevations.length === 0) {
    return {
      elevation_gain: 0,
      elevation_loss: 0,
      min_elevation: 0,
      max_elevation: 0,
      avg_elevation: 0
    };
  }

  let gain = 0;
  let loss = 0;

  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      gain += diff;
    } else {
      loss += Math.abs(diff);
    }
  }

  const minEl = Math.min(...elevations);
  const maxEl = Math.max(...elevations);
  const avgEl = elevations.reduce((a, b) => a + b, 0) / elevations.length;

  return {
    elevation_gain: Math.round(gain * 10) / 10,
    elevation_loss: Math.round(loss * 10) / 10,
    min_elevation: Math.round(minEl * 10) / 10,
    max_elevation: Math.round(maxEl * 10) / 10,
    avg_elevation: Math.round(avgEl * 10) / 10
  };
}

export default {
  calculateRoute,
  getElevationProfile
};
