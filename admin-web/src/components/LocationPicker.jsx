import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Crosshair, MapPin, Trash2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

/** Where the map opens when an event has no pin yet. */
const DEFAULT_CENTER = [10.3181, 123.9055]
const DEFAULT_ZOOM = 12
const PINNED_ZOOM = 16
/** latitude/longitude are numeric(9,6) in Postgres — more precision is noise. */
const PRECISION = 6

const round = (value) => Number(Number(value).toFixed(PRECISION))

/** Leaflet's default icon points at asset files a bundler rewrites, which is
 *  the classic "marker is a broken image" bug. Inline SVG sidesteps it. */
const pinIcon = L.divIcon({
  className: '',
  html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="#4f46e5" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/>
      <circle cx="12" cy="10" r="2.5" fill="white" stroke="none"/>
    </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 30],
})

function ClickToPin({ onPick }) {
  useMapEvents({
    click: (event) => onPick(round(event.latlng.lat), round(event.latlng.lng)),
  })
  return null
}

function MapChrome({ position }) {
  const map = useMap()

  // The map usually mounts inside a modal that was just opened; without this
  // Leaflet measures a stale size and renders a strip of grey tiles.
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 0)
    return () => clearTimeout(id)
  }, [map])

  // Follow coordinates typed or pasted into the fields, but don't yank the
  // view while the user is dragging a pin that's already visible.
  useEffect(() => {
    if (!position) return
    const point = L.latLng(position[0], position[1])
    if (!map.getBounds().contains(point)) {
      map.setView(point, Math.max(map.getZoom(), PINNED_ZOOM))
    }
  }, [map, position])

  return null
}

/**
 * Click-to-pin map for an event's coordinates.
 *
 * OpenStreetMap tiles via Leaflet — no API key, matching the mobile app's
 * choice, so both surfaces render the same map data.
 */
export function LocationPicker({ latitude, longitude, onChange, onClear, disabled = false }) {
  const [pasteError, setPasteError] = useState(null)

  const position = useMemo(() => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (latitude === '' || longitude === '' || latitude == null || longitude == null) return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return [lat, lng]
  }, [latitude, longitude])

  const pick = (lat, lng) => {
    if (disabled) return
    setPasteError(null)
    onChange(lat, lng)
  }

  /** Accepts what Google Maps puts on the clipboard: "10.3181, 123.9055". */
  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text').trim()
    const match = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (!match) return

    event.preventDefault()
    const lat = Number(match[1])
    const lng = Number(match[2])
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setPasteError('Those coordinates are out of range.')
      return
    }
    pick(round(lat), round(lng))
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="block text-sm font-medium text-slate-700">Location</span>
        {position && !disabled && (
          <button
            type="button"
            onClick={() => {
              setPasteError(null)
              onClear()
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 aria-hidden="true" className="size-3" />
            Remove pin
          </button>
        )}
      </div>

      <div
        className={`mt-1.5 overflow-hidden rounded-lg border border-slate-200 ${
          disabled ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        <MapContainer
          center={position ?? DEFAULT_CENTER}
          zoom={position ? PINNED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ height: '15rem', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPin onPick={pick} />
          <MapChrome position={position} />
          {position && (
            <Marker
              position={position}
              icon={pinIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (event) => {
                  const { lat, lng } = event.target.getLatLng()
                  pick(round(lat), round(lng))
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
        <MapPin aria-hidden="true" className="size-3" />
        {position
          ? 'Drag the pin, or click elsewhere to move it.'
          : 'Click the map to drop a pin, or paste coordinates below.'}
      </p>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="event-latitude" className="text-xs font-medium text-slate-600">
            Latitude
          </label>
          <input
            id="event-latitude"
            type="number"
            step="any"
            inputMode="decimal"
            disabled={disabled}
            value={latitude ?? ''}
            onPaste={handlePaste}
            onChange={(event) => onChange(event.target.value, longitude)}
            placeholder="10.3181"
            className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          />
        </div>
        <div>
          <label htmlFor="event-longitude" className="text-xs font-medium text-slate-600">
            Longitude
          </label>
          <input
            id="event-longitude"
            type="number"
            step="any"
            inputMode="decimal"
            disabled={disabled}
            value={longitude ?? ''}
            onPaste={handlePaste}
            onChange={(event) => onChange(latitude, event.target.value)}
            placeholder="123.9055"
            className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          />
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        <Crosshair aria-hidden="true" className="mr-1 inline size-3" />
        Paste &quot;10.3181, 123.9055&quot; from Google Maps into either field to set both.
      </p>

      {pasteError && <p className="mt-1 text-xs font-medium text-red-600">{pasteError}</p>}
    </div>
  )
}
