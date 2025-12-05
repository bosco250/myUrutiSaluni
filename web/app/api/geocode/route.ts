import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
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

    if (!data || data.error) {
      throw new Error(data.error || 'No address data returned');
    }

    const address = data.address || {};

    const street = address.road || address.street || '';
    const houseNumber = address.house_number || '';
    const fullAddress =
      [houseNumber, street].filter(Boolean).join(' ') || data.display_name?.split(',')[0] || '';

    const country = address.country || 'Rwanda';
    let district = address.district || address.county || address.state || address.province || '';
    let city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      '';

    const placeKeywords = [
      'hospital',
      'school',
      'university',
      'college',
      'church',
      'mosque',
      'temple',
      'mall',
      'market',
      'center',
      'centre',
      'plaza',
      'hotel',
      'restaurant',
      'cafe',
      'bank',
      'office',
      'building',
      'stadium',
      'park',
      'airport',
      'station',
      'street',
      'road',
      'avenue',
      'boulevard',
      'lane',
      'drive',
    ];

    const districtKeywords = ['district', 'akare', 'county', 'province', 'region', 'state'];
    const isLikelyDistrict =
      city.toLowerCase() === district.toLowerCase() ||
      districtKeywords.some((keyword) => city.toLowerCase().includes(keyword)) ||
      (district && city.toLowerCase().includes(district.toLowerCase())) ||
      (district && district.toLowerCase().includes(city.toLowerCase()));

    const isLikelyPlace = placeKeywords.some((keyword) => city.toLowerCase().includes(keyword));

    const cleanCityName = (name: string) => {
      return name
        .replace(/\bumujyi\b/gi, '')
        .replace(/\bwa\b/gi, '')
        .replace(/\bof\b/gi, '')
        .replace(/\bcity\b/gi, '')
        .replace(/\btown\b/gi, '')
        .replace(/\bville\b/gi, '')
        .replace(/\bstadt\b/gi, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+/g, ' ');
    };

    if ((isLikelyDistrict || isLikelyPlace) && data.display_name) {
      const parts = data.display_name.split(',');
      for (const part of parts) {
        const trimmed = part?.trim();
        if (trimmed && trimmed.length > 2) {
          const isDistrictPart =
            trimmed.toLowerCase() === district.toLowerCase() ||
            districtKeywords.some((keyword) => trimmed.toLowerCase().includes(keyword)) ||
            trimmed.toLowerCase() === city.toLowerCase();
          const isPlacePart = placeKeywords.some((keyword) =>
            trimmed.toLowerCase().includes(keyword)
          );
          const isStreetPart = trimmed.match(/\b(street|road|avenue|boulevard|lane|drive|way)\b/i);

          if (!isDistrictPart && !isPlacePart && !isStreetPart) {
            const cleanedCity = cleanCityName(trimmed);
            if (cleanedCity) {
              city = cleanedCity;
              break;
            }
          }
        }
      }
    }

    if ((!city || isLikelyPlace) && data.display_name) {
      const parts = data.display_name.split(',');
      for (let i = 1; i < Math.min(parts.length - 1, 5); i++) {
        const part = parts[i]?.trim();
        if (part && part.length > 2) {
          const isInvalid =
            part.match(/^(district|county|state|province|country|region)$/i) ||
            part === district ||
            placeKeywords.some((keyword) => part.toLowerCase().includes(keyword)) ||
            districtKeywords.some((keyword) => part.toLowerCase().includes(keyword));

          if (!isInvalid) {
            const cleanedCity = cleanCityName(part);
            if (cleanedCity) {
              city = cleanedCity;
              break;
            }
          }
        }
      }
    }

    if (city) {
      city = cleanCityName(city);
    }

    if (district) {
      district = district
        .replace(/^akarere\s+ka\s+/gi, '')
        .replace(/^akarere\s+/gi, '')
        .replace(/\bakarere\b/gi, '')
        .replace(/\bdistrict\b/gi, '')
        .replace(/\bcounty\b/gi, '')
        .replace(/\bprovince\b/gi, '')
        .replace(/\bregion\b/gi, '')
        .replace(/\bstate\b/gi, '')
        .replace(/\bdepartement\b/gi, '')
        .replace(/\bprefecture\b/gi, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+/g, ' ');
    }

    return NextResponse.json({
      address: fullAddress || data.display_name || '',
      city: city || '',
      district: district || '',
      country: country,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to geocode address' },
      { status: 500 }
    );
  }
}
