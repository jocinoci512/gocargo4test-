/**
 * Coordinate parser for Go Cargo admin dashboard.
 * Accepts multiple input formats and normalizes to signed decimal.
 *
 * Supported formats:
 *   34.0522          → 34.0522
 *   -118.2437        → -118.2437
 *   34.0522° N       → 34.0522
 *   118.2437° W      → -118.2437
 *   118.2437 W       → -118.2437
 *   118.2437°W       → -118.2437
 *   Latitude: 34.05° N → 34.05
 */

export interface ParseResult {
  value: number | null;
  error: string | null;
}

export function parseCoordinate(input: string, isLat: boolean): ParseResult {
  // Empty input is allowed (draft shipment)
  if (!input || input.trim() === '') {
    return { value: null, error: null };
  }

  let str = input.trim();

  // Step 1: Strip common pasted labels (case-insensitive)
  str = str.replace(/^(latitude|longitude|lat|lng|lon)\s*[:=]?\s*/i, '');

  // Step 2: Detect direction letter (N/S/E/W) at end or start
  let direction: string | null = null;

  // Check trailing direction (most common: "34.0522° N" or "34.0522 N" or "34.0522°N")
  const trailingMatch = str.match(/([NSEWnsew])\s*$/);
  if (trailingMatch) {
    direction = trailingMatch[1].toUpperCase();
    str = str.replace(/\s*[NSEWnsew]\s*$/, '');
  } else {
    // Check leading direction (less common: "N 34.0522")
    const leadingMatch = str.match(/^([NSEWnsew])\s+/);
    if (leadingMatch) {
      direction = leadingMatch[1].toUpperCase();
      str = str.replace(/^[NSEWnsew]\s+/, '');
    }
  }

  // Step 3: Remove degree symbol and extra whitespace
  str = str.replace(/°/g, '').trim();

  // Step 4: Parse the numeric value
  const num = parseFloat(str);
  if (isNaN(num)) {
    return { value: null, error: 'Must be a valid coordinate number' };
  }

  // Step 5: Warn if negative sign conflicts with direction letter
  if (direction && num < 0) {
    return { value: null, error: `Do not use a negative sign with ${direction}. Use either -${Math.abs(num)} or ${Math.abs(num)}° ${direction}` };
  }

  // Step 6: Cross-check direction vs field type
  if (direction) {
    if (isLat && (direction === 'E' || direction === 'W')) {
      return { value: null, error: 'Use N or S for latitude, not E/W' };
    }
    if (!isLat && (direction === 'N' || direction === 'S')) {
      return { value: null, error: 'Use E or W for longitude, not N/S' };
    }
  }

  // Step 6: Apply sign based on direction
  let value: number;
  if (direction === 'N' || direction === 'E') {
    value = Math.abs(num);
  } else if (direction === 'S' || direction === 'W') {
    value = -Math.abs(num);
  } else {
    // No direction letter — keep the original sign
    value = num;
  }

  // Step 7: Range validation
  if (isLat && (value < -90 || value > 90)) {
    return { value: null, error: 'Latitude must be between -90 and 90' };
  }
  if (!isLat && (value < -180 || value > 180)) {
    return { value: null, error: 'Longitude must be between -180 and 180' };
  }

  return { value, error: null };
}
