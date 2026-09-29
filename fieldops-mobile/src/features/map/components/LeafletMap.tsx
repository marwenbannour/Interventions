import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../../../theme/ThemeProvider';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title: string;
  subtitle?: string;
}

export interface LeafletMapHandle {
  centerOn: (lat: number, lng: number, zoom?: number) => void;
}

interface Props {
  markers: MapMarker[];
  user?: { lat: number; lng: number } | null;
  focusId?: string;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  onMarkerPress?: (id: string) => void;
}

/**
 * Carte OpenStreetMap (Leaflet) dans une WebView : pas de module natif supplémentaire ni de clé
 * d'API. Les données sont poussées par injectJavaScript sans recharger la page (ni les tuiles).
 */
export const LeafletMap = forwardRef<LeafletMapHandle, Props>(function LeafletMap(
  { markers, user, focusId, interactive = true, style, onMarkerPress },
  ref,
) {
  const { isDark } = useTheme();
  const webview = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    centerOn: (lat, lng, zoom = 15) => webview.current?.injectJavaScript(`window.centerOn(${lat},${lng},${zoom});true;`),
  }));

  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify({ markers, user: user ?? null, focusId: focusId ?? null, dark: isDark });
    webview.current?.injectJavaScript(`window.setData(${payload});true;`);
  }, [ready, markers, user, focusId, isDark]);

  const onMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    if (message === 'ready') setReady(true);
    else if (message.startsWith('marker:')) onMarkerPress?.(message.slice(7));
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webview}
        originWhitelist={['*']}
        source={{ html: html(interactive) }}
        onMessage={onMessage}
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  );
});

const html = (interactive: boolean) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{margin:0;height:100%;width:100%;background:#E5E7EB}
body.dark .leaflet-tile{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9)}
.pin{width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.me{width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)}
.leaflet-popup-content{font:13px system-ui;margin:10px 12px}
.leaflet-popup-content b{display:block;margin-bottom:2px}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var interactive=${interactive};
var map=L.map('map',{zoomControl:false,attributionControl:true,dragging:interactive,touchZoom:interactive,doubleClickZoom:interactive,scrollWheelZoom:false,boxZoom:false,keyboard:false,tap:interactive});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
map.setView([48.8566,2.3522],12);
var layer=L.layerGroup().addTo(map),meLayer=L.layerGroup().addTo(map),fitted=false;
function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
window.centerOn=function(lat,lng,z){map.setView([lat,lng],z||15)};
window.setData=function(d){
  document.body.className=d.dark?'dark':'';
  layer.clearLayers();meLayer.clearLayers();
  var pts=[];
  d.markers.forEach(function(m){
    var icon=L.divIcon({className:'',html:'<div class="pin" style="background:'+m.color+'"></div>',iconSize:[22,22],iconAnchor:[11,22],popupAnchor:[0,-22]});
    var mk=L.marker([m.lat,m.lng],{icon:icon}).addTo(layer);
    if(interactive){mk.bindPopup('<b>'+esc(m.title)+'</b>'+esc(m.subtitle));mk.on('click',function(){window.ReactNativeWebView.postMessage('marker:'+m.id)});}
    pts.push([m.lat,m.lng]);
    if(d.focusId===m.id){map.setView([m.lat,m.lng],16);if(interactive)mk.openPopup();fitted=true;}
  });
  if(d.user){L.marker([d.user.lat,d.user.lng],{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(meLayer);}
  if(!fitted){
    if(pts.length===1){map.setView(pts[0],15);fitted=true;}
    else if(pts.length>1){map.fitBounds(pts,{padding:[40,40],maxZoom:15});fitted=true;}
  }
};
window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
