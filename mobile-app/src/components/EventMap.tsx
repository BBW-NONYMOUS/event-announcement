// Event map: Leaflet + OpenStreetMap tiles inside a react-native-webview.
//
// Why this renders where react-native-maps didn't: react-native-webview ships
// inside Expo Go, so the map shows with plain `expo start` — no dev build, no
// Google Maps API key, no billing. The map auto-centers on the event location
// (single venue) or fits all event markers into view.
//
// A parallel EventMap.web.tsx handles web (WebView on web is limited).
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/theme/colors";
import { fill, spacing, typography } from "@/theme/typography";
import { formatPrice } from "@/lib/format";
import { hasCoords, type EventItem } from "@/lib/api";

export type EventMapProps = {
  events: EventItem[];
  onMarkerPress?: (event: EventItem) => void;
  style?: ViewStyle | ViewStyle[];
};

type Pin = { id: string; lat: number; lng: number; title: string; location: string; price: string };

function buildHtml(pins: Pin[]): string {
  // pins are injected as JSON; the inline script uses '+' concatenation only
  // (no backticks) so it stays literal text inside this TS template.
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html,body,#map{height:100%;margin:0;padding:0;background:${colors.surfaceAlt}}
    .price-pin{background:${colors.primary};color:#fff;padding:3px 9px;border-radius:999px;
      border:2px solid #fff;font:600 11px -apple-system,Roboto,sans-serif;white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.35)}
    #err{position:absolute;inset:0;display:none;align-items:center;justify-content:center;
      font:500 14px -apple-system,Roboto,sans-serif;color:${colors.textMuted};padding:24px;text-align:center}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="err">Couldn't load the map. Check your internet connection.</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          onerror="document.getElementById('err').style.display='flex'"></script>
  <script>
    function post(msg){
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
    }
    try {
      if (!window.L) { throw new Error('leaflet-missing'); }
      var events = ${JSON.stringify(pins)};
      var map = L.map('map', { zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      var coords = [];
      events.forEach(function (e) {
        var icon = L.divIcon({ className: '', html: '<div class="price-pin">' + e.price + '</div>', iconSize: [1,1] });
        L.marker([e.lat, e.lng], { icon: icon }).addTo(map)
          .bindPopup('<b>' + e.title + '</b><br/>' + e.location)
          .on('click', function () { post(e.id); });
        coords.push([e.lat, e.lng]);
      });

      if (coords.length === 1) { map.setView(coords[0], 15); }
      else if (coords.length > 1) { map.fitBounds(coords, { padding: [60, 60] }); }
      else { map.setView([10.3157, 123.8854], 12); }

      map.whenReady(function () { post('__ready__'); });
    } catch (e) {
      document.getElementById('err').style.display = 'flex';
      post('__error__');
    }
  </script>
</body>
</html>`;
}

export function EventMap({ events, onMarkerPress, style }: EventMapProps) {
  const [loading, setLoading] = useState(true);
  const webRef = useRef<WebView>(null);

  const html = useMemo(
    () =>
      buildHtml(
        // lat/lng are nullable in the API; events without them get no pin.
        events.filter(hasCoords).map((e) => ({
          id: e.id,
          lat: e.latitude,
          lng: e.longitude,
          title: e.title,
          location: e.location,
          price: formatPrice(e.price),
        }))
      ),
    [events]
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    const data = event.nativeEvent.data;
    if (data === "__ready__" || data === "__error__") {
      setLoading(false);
      return;
    }
    const match = events.find((e) => e.id === data);
    if (match) onMarkerPress?.(match);
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
      {loading ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  web: { flex: 1, backgroundColor: colors.surfaceAlt },
  loading: {
    ...fill,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  loadingText: { ...typography.caption, color: colors.textMuted },
});
