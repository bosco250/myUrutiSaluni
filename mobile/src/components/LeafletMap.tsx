import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  data?: any; // Extra data to pass back on click
}

interface Props {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Marker[];
  onMarkerPress?: (marker: Marker) => void;
  style?: any;
}

const LeafletMap: React.FC<Props> = ({ region, markers = [], onMarkerPress, style }) => {
  const webViewRef = useRef<WebView>(null);

  // HTML content with Leaflet
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${region.latitude}, ${region.longitude}], 13);
          
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OSM</a>'
          }).addTo(map);

          // Custom icon to look a bit nicer/native
          var DefaultIcon = L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
          });
          L.Marker.prototype.options.icon = DefaultIcon;

          var markersData = ${JSON.stringify(markers)};
          
          markersData.forEach(function(m) {
             var marker = L.marker([m.latitude, m.longitude]).addTo(map);
             marker.bindPopup("<b>" + m.title + "</b><br>" + (m.description || "")).on('popupopen', function() {
                 // Send message back to RN when popup opens (simulating a "press" or selection)
                 window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
             });
             // Also click directly
             marker.on('click', function() {
                 window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
             });
          });
        </script>
      </body>
    </html>
  `;

  // Update map when region changes (optional, might cause reloads if strict props)
  // For now we rely on initial load or injectedJS for updates if needed.
  // Real dynamic updates would involve injecting JS to setView.

  useEffect(() => {
     if (webViewRef.current) {
        // Example: Update view if region changes significantly?
        // webViewRef.current.injectJavaScript(\`map.setView([${region.latitude}, ${region.longitude}]); true;\`);
     }
  }, [region]);

  const handleMessage = (event: any) => {
    try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'markerPress') {
            const marker = markers.find(m => m.id === data.id);
            if (marker && onMarkerPress) {
                onMarkerPress(marker);
            }
        }
    } catch (e) {
        console.warn("Map message error", e);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={{ flex: 1 }}
        startInLoadingState={true}
        renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default LeafletMap;
