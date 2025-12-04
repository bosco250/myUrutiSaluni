import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SalonAssociationApp/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      throw new Error(data.error || 'No address data returned');
    }

    const address = data.address || {};

    // Extract address components
    const street = address.road || address.street || '';
    const houseNumber = address.house_number || '';
    const fullAddress = [houseNumber, street].filter(Boolean).join(' ') || data.display_name?.split(',')[0] || '';

    // Extract city (could be city, town, or village)
    const city = address.city || address.town || address.village || address.municipality || '';

    // Extract district (could be district, county, or state)
    const district = address.district || address.county || address.state || '';

    // Extract country
    const country = address.country || 'Rwanda';

    return NextResponse.json({
      address: fullAddress || data.display_name || '',
      city: city || '',
      district: district || '',
      country: country,
    });
  } catch (error: any) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to geocode address' },
      { status: 500 }
    );
  }
}

