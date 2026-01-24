import { NextRequest, NextResponse } from 'next/server';

export interface GeocodeSuggestion {
  displayName: string;
  address: string;
  city: string;
  district: string;
  country: string;
  latitude: number;
  longitude: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    // Use Nominatim for forward geocoding with Rwanda bias
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=rw&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SalonAssociationApp/1.0',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: GeocodeSuggestion[] = data.map((item: any) => {
      const address = item.address || {};
      
      // Build address string
      const street = address.road || address.street || '';
      const houseNumber = address.house_number || '';
      const fullAddress = [houseNumber, street].filter(Boolean).join(' ') || 
        item.display_name?.split(',')[0] || '';

      // Extract and clean city name
      let city = address.city || 
        address.town || 
        address.village || 
        address.municipality || 
        address.suburb || '';
      
      // Clean city name - remove Kinyarwanda and common prefixes
      if (city) {
        city = city
          .replace(/^umujyi\s+wa\s+/gi, '')  // "Umujyi wa Kigali" -> "Kigali"
          .replace(/^umujyi\s+/gi, '')        // "Umujyi Kigali" -> "Kigali"
          .replace(/\bumujyi\b/gi, '')        // Remove standalone "umujyi"
          .replace(/^city\s+of\s+/gi, '')     // "City of Kigali" -> "Kigali"
          .replace(/\bcity\b/gi, '')          // Remove standalone "city"
          .replace(/^town\s+of\s+/gi, '')     // "Town of X" -> "X"
          .replace(/\btown\b/gi, '')
          .replace(/\bville\b/gi, '')
          .replace(/^\s+|\s+$/g, '')          // Trim whitespace
          .replace(/\s+/g, ' ');              // Normalize multiple spaces
      }

      // Extract and clean district
      let district = address.district || 
        address.county || 
        address.state || 
        address.province || '';
      
      // Clean district name
      if (district) {
        district = district
          .replace(/^akarere\s+ka\s+/gi, '')  // "Akarere ka Nyarugenge" -> "Nyarugenge"
          .replace(/^akarere\s+/gi, '')
          .replace(/\bakarere\b/gi, '')
          .replace(/\bdistrict\b/gi, '')
          .replace(/\bcounty\b/gi, '')
          .replace(/\bprovince\b/gi, '')
          .replace(/\bregion\b/gi, '')
          .replace(/\bstate\b/gi, '')
          .replace(/^\s+|\s+$/g, '')
          .replace(/\s+/g, ' ');
      }

      const country = address.country || 'Rwanda';

      return {
        displayName: item.display_name || '',
        address: fullAddress,
        city: city,
        district: district,
        country: country,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Geocode search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search address', suggestions: [] },
      { status: 500 }
    );
  }
}
