export const defaultMapCenter = Object.freeze({ lat: -15.13, lng: -53.19 });
export const defaultMapZoom = 4;

function escapeMarkerContent(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function hasMapCoordinates(message) {
  return Number.isFinite(Number(message?.latitude)) && Number.isFinite(Number(message?.longitude));
}

export function formatCoordinate(value, positiveLabel, negativeLabel) {
  if (!Number.isFinite(value)) {
    return 'indisponivel';
  }

  const direction = value >= 0 ? positiveLabel : negativeLabel;

  return `${Math.abs(value).toFixed(4)}° ${direction}`;
}

export async function loadMapModules() {
  const [
    MapModule,
    ViewModule,
    TileLayerModule,
    OSMModule,
    OverlayModule,
    projModule,
  ] = await Promise.all([
    import('ol/Map.js'),
    import('ol/View.js'),
    import('ol/layer/Tile.js'),
    import('ol/source/OSM.js'),
    import('ol/Overlay.js'),
    import('ol/proj.js'),
  ]);

  return {
    Map: MapModule.default,
    View: ViewModule.default,
    TileLayer: TileLayerModule.default,
    OSM: OSMModule.default,
    Overlay: OverlayModule.default,
    fromLonLat: projModule.fromLonLat,
    toLonLat: projModule.toLonLat,
  };
}

export function createOpenStreetMap(container, modules) {
  const { Map, View, TileLayer, OSM, fromLonLat } = modules;

  const map = new Map({
    target: container,
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
    ],
    view: new View({
      center: fromLonLat([defaultMapCenter.lng, defaultMapCenter.lat]),
      zoom: defaultMapZoom,
      minZoom: 2,
      maxZoom: 8,
    }),
  });

  return { map };
}

export function attachMapResizeHandling(map, container) {
  const updateMapSize = () => {
    map.updateSize();
  };

  const timeoutId = window.setTimeout(updateMapSize, 120);
  const frameId = window.requestAnimationFrame(updateMapSize);
  window.addEventListener('resize', updateMapSize);

  let resizeObserver = null;

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      updateMapSize();
    });

    resizeObserver.observe(container);
  }

  return () => {
    window.clearTimeout(timeoutId);
    window.cancelAnimationFrame(frameId);
    window.removeEventListener('resize', updateMapSize);
    resizeObserver?.disconnect();
  };
}

export function syncMessageMarkers({
  map,
  modules,
  markerOverlaysRef,
  messages,
  getMessageMetrics,
  getMessageAuthorLabel,
  onMarkerClick,
}) {
  markerOverlaysRef.value.forEach((overlay) => {
    map.removeOverlay(overlay);
  });
  markerOverlaysRef.value = [];

  messages.filter(hasMapCoordinates).forEach((message) => {
    const { messageSize, emojiSize } = getMessageMetrics(message);
    const element = document.createElement('button');

    element.type = 'button';
    element.className = 'message message-map-pin';
    element.title = getMessageAuthorLabel(message);
    element.style.width = `${messageSize}px`;
    element.style.height = `${messageSize}px`;
    element.style.minWidth = `${messageSize}px`;
    element.style.minHeight = `${messageSize}px`;
    element.innerHTML = `<span class="message-emoji" style="font-size:${emojiSize}rem;">${escapeMarkerContent(message.emoji || '💬')}</span>`;
    element.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onMarkerClick(message);
    });

    const overlay = new modules.Overlay({
      element,
      positioning: 'center-center',
      stopEvent: false,
      position: modules.fromLonLat([Number(message.longitude), Number(message.latitude)]),
    });

    map.addOverlay(overlay);
    markerOverlaysRef.value.push(overlay);
  });
}

export function getMapEventCoordinates(event, modules) {
  const [longitude, latitude] = modules.toLonLat(event.coordinate);

  return {
    lat: Number(latitude.toFixed(6)),
    lng: Number(longitude.toFixed(6)),
  };
}

export function flyToMessage(map, modules, message) {
  if (!hasMapCoordinates(message)) {
    return;
  }

  map.getView().animate({
    center: modules.fromLonLat([Number(message.longitude), Number(message.latitude)]),
    zoom: Math.max(map.getView().getZoom() ?? defaultMapZoom, 4),
    duration: 350,
  });
}