import { useEffect, useMemo, useRef, useState } from "react"
import { Pressable } from "react-native"
import { WebView } from "react-native-webview"

import { API_BASE_URL } from "@/lib/config"
import { Box } from "@/ui"

export interface MiniLatLng {
  latitude: number
  longitude: number
}

/**
 * Leaflet minimap rendered in a WebView — the mobile twin of the web
 * `components/shared/ar/ar-minimap.tsx`. Reusing Leaflet + OpenStreetMap keeps
 * the look and behaviour identical to the web app and needs no Google Maps API
 * key. Tiles load from OSM, so the map needs network (same as the web).
 */

const NAV_BLUE = "#1A73E8"

function buildHtml(interactive: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; background: #FAFAFA; overflow: hidden; }
  #wrap { position: absolute; inset: 0; }
  #map { position: absolute; inset: 0; }
  .leaflet-control-attribution { font-size: 8px; background: rgba(255,255,255,0.7); }
  .ar-counter { display: flex; align-items: center; justify-content: center; }
  .ar-dot { width: 14px; height: 14px; border-radius: 50%; background: ${NAV_BLUE}; border: 2px solid #fff; box-shadow: 0 0 0 2px rgba(26,115,232,0.3); }
  .ar-pin { width: 16px; height: 16px; border-radius: 50%; background: #DC2626; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
  .leaflet-marker-icon { background: transparent; border: none; }
</style>
</head>
<body>
<div id="wrap"><div id="map"></div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var INTERACTIVE = ${interactive ? "true" : "false"};
  var map = L.map('map', {
    zoomControl: INTERACTIVE,
    attributionControl: true,
    dragging: INTERACTIVE,
    scrollWheelZoom: INTERACTIVE,
    doubleClickZoom: INTERACTIVE,
    touchZoom: INTERACTIVE,
    boxZoom: false,
    keyboard: false,
    tap: INTERACTIVE
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  map.setView([2.929, 101.782], 16);

  var userMarker = null, destMarker = null, line = null;
  var heading = 0;

  function divIcon(html, cls) {
    return L.divIcon({ className: '', html: '<div class="ar-counter ' + cls + '">' + html + '</div>', iconSize: [0, 0] });
  }

  function applyRotation() {
    if (INTERACTIVE) return;
    document.getElementById('wrap').style.transform = 'rotate(' + (-heading) + 'deg)';
    var nodes = document.querySelectorAll('.ar-counter');
    for (var i = 0; i < nodes.length; i++) nodes[i].style.transform = 'rotate(' + heading + 'deg)';
  }

  window.__update = function (data) {
    heading = data.heading || 0;
    var user = data.user, dest = data.destination;

    if (dest) {
      if (!destMarker) destMarker = L.marker([dest.lat, dest.lng], { icon: divIcon('<div class="ar-pin"></div>', 'ar-dest') }).addTo(map);
      else destMarker.setLatLng([dest.lat, dest.lng]);
    }
    if (user) {
      if (!userMarker) userMarker = L.marker([user.lat, user.lng], { icon: divIcon('<div class="ar-dot"></div>', 'ar-user') }).addTo(map);
      else userMarker.setLatLng([user.lat, user.lng]);
    }

    var pts = null;
    if (data.route && data.route.length > 1) {
      pts = data.route.map(function (p) { return [p.lat, p.lng]; });
    } else if (user && dest) {
      pts = [[user.lat, user.lng], [dest.lat, dest.lng]];
    }

    if (pts) {
      if (!line) line = L.polyline(pts, { color: '${NAV_BLUE}', weight: 3 }).addTo(map);
      else line.setLatLngs(pts);
      var pad = INTERACTIVE ? [40, 40] : [14, 14];
      map.fitBounds(L.latLngBounds(pts), { padding: pad, maxZoom: 17, animate: false });
    } else if (user) {
      map.setView([user.lat, user.lng], map.getZoom(), { animate: false });
    }

    applyRotation();
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('updated');
  };

  map.whenReady(function () {
    applyRotation();
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
  });
</script>
</body>
</html>`
}

function LeafletMap({
  user,
  destination,
  heading,
  route,
  interactive,
}: {
  user: MiniLatLng | null
  destination: MiniLatLng | null
  heading: number
  route: MiniLatLng[] | null
  interactive: boolean
}) {
  const ref = useRef<WebView>(null)
  const [ready, setReady] = useState(false)
  const html = useMemo(() => buildHtml(interactive), [interactive])

  const userLat = user?.latitude ?? null
  const userLng = user?.longitude ?? null
  const destLat = destination?.latitude ?? null
  const destLng = destination?.longitude ?? null

  const payload = useMemo(
    () => ({
      user: userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null,
      destination: destLat != null && destLng != null ? { lat: destLat, lng: destLng } : null,
      heading,
      route: route ? route.map((p) => ({ lat: p.latitude, lng: p.longitude })) : null,
    }),
    [userLat, userLng, destLat, destLng, heading, route]
  )

  useEffect(() => {
    if (!ready) return
    ref.current?.injectJavaScript(`window.__update(${JSON.stringify(payload)}); true;`)
  }, [ready, payload])

  return (
    <WebView
      ref={ref}
      source={{ html, baseUrl: API_BASE_URL }}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      overScrollMode="never"
      pointerEvents={interactive ? "auto" : "none"}
      onMessage={() => setReady(true)}
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
    />
  )
}

/** Small circular heading-up radar; tap to expand. */
export function ArRadar({
  user,
  destination,
  heading,
  route,
  onExpand,
}: {
  user: MiniLatLng | null
  destination: MiniLatLng | null
  heading: number
  route: MiniLatLng[] | null
  onExpand: () => void
}) {
  return (
    <Pressable onPress={onExpand}>
      <Box
        width={116}
        height={116}
        borderRadius="pill"
        overflow="hidden"
        borderWidth={2}
        borderColor="surface"
        backgroundColor="canvasSunk"
        style={{ elevation: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
      >
        <LeafletMap
          user={user}
          destination={destination}
          heading={heading}
          route={route}
          interactive={false}
        />
      </Box>
    </Pressable>
  )
}

/** Full-screen interactive north-up map. */
export function ArFullMap(props: {
  user: MiniLatLng | null
  destination: MiniLatLng | null
  heading: number
  route: MiniLatLng[] | null
}) {
  return <LeafletMap {...props} interactive />
}
