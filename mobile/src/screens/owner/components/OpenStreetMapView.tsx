import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { theme } from '../../../theme';

interface SafeMapViewProps {
  latitude?: number;
  longitude?: number;
  onLocationSelected: (lat: number, lng: number, address?: string, city?: string, district?: string) => void;
  isDark: boolean;
}

export const OpenStreetMapView: React.FC<SafeMapViewProps> = ({
  latitude,
  longitude,
  onLocationSelected,
  isDark,
}) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentLat, setCurrentLat] = useState(latitude || -1.9403);
  const [currentLng, setCurrentLng] = useState(longitude || 29.8739);

  // OpenStreetMap HTML with Leaflet
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100%; }
            .controls {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
            }
            .gps-btn {
                background: #C89B68;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
        </style>
    </head>
    <body>
        <div class="controls">
            <button class="gps-btn" onclick="getCurrentLocation()" title="My Location">📍</button>
        </div>
        <div id="map"></div>
        
        <script>
            let map, marker;
            let currentLat = ${currentLat};
            let currentLng = ${currentLng};
            
            // Initialize map
            map = L.map('map').setView([currentLat, currentLng], 15);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
            
            // Add marker
            marker = L.marker([currentLat, currentLng], {
                draggable: true
            }).addTo(map);
            
            // Handle map click
            map.on('click', function(e) {
                updateLocation(e.latlng.lat, e.latlng.lng);
            });
            
            // Handle marker drag
            marker.on('dragend', function(e) {
                const pos = e.target.getLatLng();
                updateLocation(pos.lat, pos.lng);
            });
            
            function updateLocation(lat, lng) {
                currentLat = lat;
                currentLng = lng;
                marker.setLatLng([lat, lng]);
                
                // Send to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationSelected',
                    latitude: lat,
                    longitude: lng
                }));
            }
            
            function getCurrentLocation() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(position) {
                        updateLocation(position.coords.latitude, position.coords.longitude);
                        map.setView([position.coords.latitude, position.coords.longitude], 15);
                    });
                }
            }
        </script>
    </body>
    </html>
  `;

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setCurrentLat(data.latitude);
        setCurrentLng(data.longitude);
        
        // Get address with proper Rwanda administrative levels
        Location.reverseGeocodeAsync({
          latitude: data.latitude,
          longitude: data.longitude
        }).then(results => {
          if (results[0]) {
            const place = results[0];
            const addressParts = [
              place.streetNumber,
              place.street
            ].filter(Boolean);
            const address = addressParts.join(' ');
            
            // For Rwanda: use proper administrative levels
            // District = place.subregion (administrative level 2)
            // City/Town = place.city or place.locality
            const district = place.subregion || place.region || '';
            const city = place.city || place.locality || place.town || '';
            
            onLocationSelected(data.latitude, data.longitude, address, city, district);
          } else {
            onLocationSelected(data.latitude, data.longitude, '', '', '');
          }
        }).catch(() => {
          onLocationSelected(data.latitude, data.longitude, '', '', '');
        });
      }
    } catch (error) {
      console.error('Map message error:', error);
    }
  }, [onLocationSelected]);

  const getCurrentLocation = useCallback(async () => {
    try {
      setGpsLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      setCurrentLat(lat);
      setCurrentLng(lng);

      // Get address with proper Rwanda administrative levels
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results[0]) {
          const place = results[0];
          const addressParts = [
            place.streetNumber,
            place.street
          ].filter(Boolean);
          const address = addressParts.join(' ');
          
          // For Rwanda: use proper administrative levels
          // District = place.subregion (administrative level 2)
          // City/Town = place.city or place.locality
          const district = place.subregion || place.region || '';
          const city = place.city || place.locality || place.town || '';
          
          onLocationSelected(lat, lng, address, city, district);
        } else {
          onLocationSelected(lat, lng, '', '', '');
        }
      } catch {
        onLocationSelected(lat, lng, '', '', '');
      }
    } catch (error) {
      console.error('GPS error:', error);
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  }, [onLocationSelected]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>
        Salon Location
      </Text>
      
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHtml }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: isDark ? '#8E8E93' : theme.colors.textSecondary }]}>
                Loading map...
              </Text>
            </View>
          )}
        />
        
        {/* External GPS Button */}
        <TouchableOpacity
          style={styles.gpsControl}
          onPress={getCurrentLocation}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <MaterialIcons name="my-location" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Location Info */}
      {currentLat && currentLng && (
        <View style={[styles.locationInfo, { backgroundColor: isDark ? '#2C2C2E' : '#F8F9FA' }]}>
          <MaterialIcons name="location-on" size={16} color={theme.colors.success} />
          <Text style={[styles.coordText, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>
            {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
          </Text>
        </View>
      )}
      
      <Text style={[styles.helpText, { color: isDark ? '#8E8E93' : theme.colors.textSecondary }]}>
        Tap on the map to select your salon location
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 12 },
  
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  gpsControl: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  coordText: { fontSize: 12, marginLeft: 8, fontFamily: 'monospace' },
  
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: { marginTop: 12, fontSize: 14 },
});