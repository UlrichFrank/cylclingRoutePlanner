/**
 * Polyline Decoder for Google Maps Polyline Algorithm
 * Converts compressed polyline strings to lat/lon coordinates
 * 
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') {
    return [];
  }

  const poly = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b;

    // Decode latitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    // Decode longitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      lat: lat / 1e5,
      lon: lng / 1e5
    });
  }

  return poly;
}

/**
 * Sample points at regular distance intervals
 * @param {Array} points - Array of {lat, lon} coordinates
 * @param {number} sampleDistanceM - Distance in meters between samples
 * @returns {Array} Sampled points
 */
export function samplePointsByDistance(points, sampleDistanceM = 50) {
  if (!Array.isArray(points) || points.length < 2) {
    return points;
  }

  const sampled = [points[0]]; // Always include first point
  let accumulatedDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const distance = haversineDistance(points[i - 1], points[i]);
    accumulatedDistance += distance;

    // Sample if we've traveled the target distance
    if (accumulatedDistance >= sampleDistanceM) {
      sampled.push(points[i]);
      accumulatedDistance = 0;
    }
  }

  // Always include last point if it's not already there
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }

  return sampled;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} p1 - {lat, lon}
 * @param {Object} p2 - {lat, lon}
 * @returns {number} Distance in meters
 */
function haversineDistance(p1, p2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
