import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

type Coordinates = { lat: number; lng: number };

let mapsLoader: Promise<void> | undefined;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly`;
    script.async = true;
    script.onload = () => window.google?.maps ? resolve() : reject(new Error("Google Maps did not initialize."));
    script.onerror = () => reject(new Error("Google Maps could not be loaded. Check the API key and enabled APIs."));
    document.head.appendChild(script);
  }).catch((error) => {
    mapsLoader = undefined;
    throw error;
  });

  return mapsLoader;
}

export function GooglePlotPicker({
  coordinates,
  onChange,
}: {
  coordinates?: Coordinates;
  onChange: (coordinates: Coordinates) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [message, setMessage] = useState("");
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

  useEffect(() => {
    if (!apiKey) {
      setMessage("Add VITE_GOOGLE_MAPS_API_KEY to .env.local to enable the map.");
      return;
    }

    let disposed = false;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (disposed || !mapElement.current) return;
        const initialCenter = coordinates ?? { lat: 23.8103, lng: 90.4125 };
        const map = new window.google.maps.Map(mapElement.current, {
          center: initialCenter,
          zoom: coordinates ? 17 : 11,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        const marker = new window.google.maps.Marker({
          map: coordinates ? map : null,
          position: coordinates ?? undefined,
          draggable: true,
          title: "Selected plot location",
        });
        markerRef.current = marker;

        const update = (position: any) => {
          if (!position) return;
          const next = { lat: position.lat(), lng: position.lng() };
          marker.setPosition(next);
          marker.setMap(map);
          onChangeRef.current(next);
        };
        map.addListener("click", (event: any) => update(event.latLng));
        marker.addListener("dragend", (event: any) => update(event.latLng));
        setMessage("Click the map or drag the pin to the plot location.");
      })
      .catch((error: Error) => setMessage(error.message));

    return () => {
      disposed = true;
      if (markerRef.current) markerRef.current.setMap(null);
    };
  }, [apiKey]);

  if (!apiKey) {
    const lat = coordinates?.lat ?? 23.8103;
    const lng = coordinates?.lng ?? 90.4125;
    return (
      <div className="rounded-lg border bg-cad-grid p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded border bg-card text-foreground shadow-card">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="7" strokeDasharray="2 2" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                <circle cx="12" cy="12" r="1.5" className="fill-primary stroke-none" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-medium text-foreground">Site Coordinate Reference</p>
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
              </p>
            </div>
          </div>
          <span className="rounded border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {coordinates ? "Pin Recorded" : "Default Center"}
          </span>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Optional: set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="font-mono">.env.local</code> for live Google Maps tiling.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div ref={mapElement} className="h-64 w-full rounded-lg border bg-muted" />
      <p className="mt-2 text-xs text-muted-foreground">{message} Map coordinates do not establish plot boundaries, zoning, or authority jurisdiction.</p>
    </div>
  );
}
