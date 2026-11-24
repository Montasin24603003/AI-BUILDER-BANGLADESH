import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  Compass,
  Factory,
  FolderKanban,
  Globe,
  KeyRound,
  Layers,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RegulatoryDisclaimerBanner } from "@/components/app/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBangladesh } from "@/context/BangladeshContext";
import { detectJurisdiction } from "@/services/bangladeshEngine";
import { toast } from "sonner";

type ZoneCategory = "all" | "project" | "residential" | "mall" | "garment";
type MapProvider = "live-osm" | "google-maps";
type BaseLayerStyle = "street" | "satellite";

interface BangladeshDevZone {
  id: string;
  name: string;
  category: Exclude<ZoneCategory, "all">;
  district: string;
  area: string;
  lat: number;
  lng: number;
  authority: string;
  allowedTypes: string;
  roadRequirement: string;
  notes: string;
}

const BANGLADESH_CENTER: [number, number] = [23.777, 90.399];

const BANGLADESH_ZONES: BangladeshDevZone[] = [
  // Active / Residential Projects & Building Zones
  {
    id: "zone-uttara",
    name: "Uttara Sector 11–18 Residential",
    category: "residential",
    district: "Dhaka",
    area: "Uttara",
    lat: 23.8759,
    lng: 90.3795,
    authority: "RAJUK",
    allowedTypes: "Residential Apartments (R1/R2), Neighborhood Retail on Wide Roads",
    roadRequirement: "20 ft – 60 ft Sector Roads",
    notes: "Governed by RAJUK DAP block FAR & Dhaka Metropolitan Building Rules. CAAB height clearance applies near Hazrat Shahjalal Airport funnel.",
  },
  {
    id: "zone-purbachal",
    name: "Purbachal New Town Project",
    category: "project",
    district: "Dhaka",
    area: "Purbachal",
    lat: 23.845,
    lng: 90.501,
    authority: "RAJUK",
    allowedTypes: "Planned Residential Plots, Institutional, Commercial & Civic Sectors",
    roadRequirement: "30 ft – 300 ft Expressway",
    notes: "Planned RAJUK township with sector-specific plot ratios and strict setback schedules.",
  },
  {
    id: "zone-bashundhara",
    name: "Bashundhara R/A Building Zone",
    category: "residential",
    district: "Dhaka",
    area: "Bashundhara R/A",
    lat: 23.8191,
    lng: 90.4526,
    authority: "RAJUK",
    allowedTypes: "Multi-Family Residential, Universities, Hospitals (Designated Blocks)",
    roadRequirement: "25 ft – 100 ft Block Roads",
    notes: "Soft-to-medium clay pockets in eastern blocks require SPT soil investigation before foundation sizing.",
  },
  {
    id: "zone-ctg-res",
    name: "Nasirabad & Khulshi Residential",
    category: "residential",
    district: "Chattogram",
    area: "Nasirabad",
    lat: 22.362,
    lng: 91.812,
    authority: "CDA",
    allowedTypes: "Residential & Mixed-Use Buildings",
    roadRequirement: "20 ft+ CDA Roads",
    notes: "CDA Master Plan zoning + BNBC 2020 Seismic Zone 3 (Z=0.28). Hill-cutting restrictions apply near Khulshi slopes.",
  },
  {
    id: "zone-khl-res",
    name: "Sonadanga & Boyra Residential",
    category: "residential",
    district: "Khulna",
    area: "Sonadanga",
    lat: 22.825,
    lng: 89.545,
    authority: "KDA",
    allowedTypes: "Residential Apartments & Townhouses",
    roadRequirement: "20 ft+ KDA Roads",
    notes: "Governed by Khulna Development Authority (KDA). Soft alluvial clay typically requires pile/mat foundation checks.",
  },
  {
    id: "zone-raj-res",
    name: "Padma R/A & Shaheb Bazar",
    category: "residential",
    district: "Rajshahi",
    area: "Padma R/A",
    lat: 24.3745,
    lng: 88.6042,
    authority: "RDA",
    allowedTypes: "Residential & Mixed Civic Buildings",
    roadRequirement: "20 ft+ RDA Roads",
    notes: "Governed by Rajshahi Development Authority (RDA) & BNBC 2020 Seismic Zone 2.",
  },
  {
    id: "zone-syl-res",
    name: "Shahjalal Upashahar Housing",
    category: "residential",
    district: "Sylhet",
    area: "Shahjalal Upashahar",
    lat: 24.8895,
    lng: 91.883,
    authority: "CITY_CORP",
    allowedTypes: "Residential & Urban Housing",
    roadRequirement: "20 ft+ SCC Roads",
    notes: "BNBC 2020 Seismic Zone 4 (Z=0.36 — highest seismic zone in Bangladesh). Strict ductile detailing mandatory.",
  },
  {
    id: "zone-cox-proj",
    name: "Cox's Bazar Marine Drive Hospitality",
    category: "project",
    district: "Cox's Bazar",
    area: "Kolatoli",
    lat: 21.4165,
    lng: 91.984,
    authority: "CoxDA",
    allowedTypes: "Hotels, Resorts & Coastal Residential",
    roadRequirement: "30 ft+ Marine Drive",
    notes: "CoxDA coastal height limits, Ecologically Critical Area (ECA) setbacks, and 80 m/s cyclone wind-load design.",
  },

  // Shopping Malls & Commercial Zones
  {
    id: "mall-gulshan",
    name: "Gulshan–Banani Commercial Avenue",
    category: "mall",
    district: "Dhaka",
    area: "Gulshan",
    lat: 23.7925,
    lng: 90.4078,
    authority: "RAJUK",
    allowedTypes: "Shopping Malls, Corporate Towers, Commercial High-Rises",
    roadRequirement: "40 ft – 100 ft Commercial Roads",
    notes: "Commercial FAR bonus requires wide frontage, multi-basement parking, FSCD NOC, and traffic clearance.",
  },
  {
    id: "mall-panthapath",
    name: "Panthapath / Karwan Bazar Retail Hub",
    category: "mall",
    district: "Dhaka",
    area: "Motijheel",
    lat: 23.7509,
    lng: 90.3906,
    authority: "RAJUK",
    allowedTypes: "Mega Shopping Malls, Multiplexes & Commercial Offices",
    roadRequirement: "60 ft+ Primary Arterial",
    notes: "Assembly/Mercantile occupancy under BNBC 2020 Part 4 requires pressurized fire stairs, sprinklers, and dual exits.",
  },
  {
    id: "mall-agrabad",
    name: "Agrabad Commercial & Mall District",
    category: "mall",
    district: "Chattogram",
    area: "Agrabad",
    lat: 22.3258,
    lng: 91.8124,
    authority: "CDA",
    allowedTypes: "Shopping Malls, Port Commercial Offices, Banks",
    roadRequirement: "40 ft – 80 ft Commercial Access",
    notes: "CDA Commercial Zone; elevated plinth recommended for monsoon tidal waterlogging resilience.",
  },
  {
    id: "mall-zindabazar",
    name: "Zindabazar Commercial Plaza Zone",
    category: "mall",
    district: "Sylhet",
    area: "Zindabazar",
    lat: 24.8949,
    lng: 91.8687,
    authority: "CITY_CORP",
    allowedTypes: "Shopping Complexes & Commercial Buildings",
    roadRequirement: "30 ft+ City Corp Road",
    notes: "SCC commercial rules + BNBC Seismic Zone 4 structural requirements.",
  },

  // Garments & Industrial Zones
  {
    id: "grm-gazipur",
    name: "Gazipur Konabari–Tongi Garment Belt",
    category: "garment",
    district: "Gazipur",
    area: "Konabari",
    lat: 23.9985,
    lng: 90.317,
    authority: "GDA",
    allowedTypes: "RMG Garment Factories, Textile Mills, Warehouses",
    roadRequirement: "40 ft+ Industrial Truck Access",
    notes: "Requires GDA industrial zoning, Dept. of Environment (DoE) ETP clearance, DIFE safety approval, and FSCD Industrial Fire NOC.",
  },
  {
    id: "grm-ashulia",
    name: "Ashulia–DEPZ Garment Corridor",
    category: "garment",
    district: "Dhaka",
    area: "Savar",
    lat: 23.951,
    lng: 90.276,
    authority: "RAJUK / BEPZA",
    allowedTypes: "Export-Oriented Garments (RMG), EPZ Industrial Sheds",
    roadRequirement: "40 ft – 80 ft Highway Access",
    notes: "RMG buildings must comply with BNBC 2020 Occupancy G (Industrial), wide fire-rated stairwells, and structural load certification.",
  },
  {
    id: "grm-narayanganj",
    name: "Fatullah–BSCIC Knitwear & Garment Zone",
    category: "garment",
    district: "Narayanganj",
    area: "Fatullah",
    lat: 23.643,
    lng: 90.489,
    authority: "RAJUK / BSCIC",
    allowedTypes: "Knitwear Garments, Dyeing & Packaging Units",
    roadRequirement: "30 ft+ Industrial Estate Road",
    notes: "Confirm BSCIC / Narayanganj City Corp / RAJUK fringe boundary and ETP effluent compliance.",
  },
  {
    id: "grm-cepz",
    name: "Chattogram EPZ (CEPZ) Garment Hub",
    category: "garment",
    district: "Chattogram",
    area: "Patenga",
    lat: 22.288,
    lng: 91.778,
    authority: "CDA / BEPZA",
    allowedTypes: "Heavy Garments, Footwear & Export Manufacturing",
    roadRequirement: "40 ft+ Port Arterial",
    notes: "Coastal wind-load (80 m/s), Seismic Zone 3, and BEPZA / FSCD industrial fire compliance.",
  },
  {
    id: "grm-mirsharai",
    name: "Mirsharai National Economic Zone (BEZA)",
    category: "garment",
    district: "Chattogram",
    area: "Mirsharai",
    lat: 22.775,
    lng: 91.472,
    authority: "BEZA / CDA",
    allowedTypes: "Large-Scale Garment Parks, Industrial Plants & Logistics",
    roadRequirement: "60 ft+ Industrial Corridor",
    notes: "Dedicated planned industrial zone separated from residential neighborhoods.",
  },
];

const QUICK_DIVISIONS: Array<{ label: string; coords: [number, number]; zoom: number }> = [
  { label: "Full Bangladesh", coords: [23.777, 90.399], zoom: 7 },
  { label: "Dhaka Metro", coords: [23.8103, 90.4125], zoom: 11 },
  { label: "Gazipur RMG", coords: [23.9985, 90.36], zoom: 12 },
  { label: "Narayanganj", coords: [23.6238, 90.5], zoom: 12 },
  { label: "Chattogram", coords: [22.3569, 91.7832], zoom: 11 },
  { label: "Khulna", coords: [22.8456, 89.5403], zoom: 12 },
  { label: "Rajshahi", coords: [24.3745, 88.6042], zoom: 12 },
  { label: "Sylhet", coords: [24.8949, 91.8687], zoom: 12 },
  { label: "Cox's Bazar", coords: [21.4272, 92.0058], zoom: 12 },
];

const CATEGORY_COLORS: Record<Exclude<ZoneCategory, "all">, string> = {
  project: "#2563eb",
  residential: "#059669",
  mall: "#d97706",
  garment: "#dc2626",
};

const CATEGORY_LABELS: Record<Exclude<ZoneCategory, "all">, string> = {
  project: "Active Project",
  residential: "Residential / Building",
  mall: "Shopping Mall / Commercial",
  garment: "Garments / Industrial",
};

declare global {
  interface Window {
    google?: any;
  }
}

export default function BangladeshMapPage() {
  const navigate = useNavigate();
  const { activePlot, runPlotAnalysis } = useBangladesh();

  const envGoogleKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || "";
  const [customGoogleKey, setCustomGoogleKey] = useState<string>(() => localStorage.getItem("plancheck_gmaps_key") || "");
  const effectiveGoogleKey = envGoogleKey || customGoogleKey;

  const [provider, setProvider] = useState<MapProvider>(() => (effectiveGoogleKey ? "google-maps" : "live-osm"));
  const [baseStyle, setBaseStyle] = useState<BaseLayerStyle>("street");
  const [categoryFilter, setCategoryFilter] = useState<ZoneCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [keyDraft, setKeyDraft] = useState(customGoogleKey);

  const [selectedZone, setSelectedZone] = useState<BangladeshDevZone | null>(BANGLADESH_ZONES[0]);
  const [customPin, setCustomPin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletTileRef = useRef<L.TileLayer | null>(null);
  const leafletMarkersRef = useRef<L.LayerGroup | null>(null);
  const googleMapRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);

  const visibleZones = useMemo(() => {
    const projectMarker: BangladeshDevZone = {
      id: "active-plot-pin",
      name: `Your Project: ${activePlot.input.projectName}`,
      category: "project",
      district: activePlot.input.district,
      area: activePlot.input.upazilaOrArea || "Active Site",
      lat: activePlot.input.coordinates?.lat ?? 23.8759,
      lng: activePlot.input.coordinates?.lng ?? 90.3795,
      authority: activePlot.jurisdiction.authority,
      allowedTypes: `${activePlot.input.buildingPurpose} · ${activePlot.input.landUseZone}`,
      roadRequirement: `${activePlot.input.roadWidthFt ?? 30} ft abutting road`,
      notes: "Synced from your active Plot Analysis workspace.",
    };
    const all = [projectMarker, ...BANGLADESH_ZONES];
    if (categoryFilter === "all") return all;
    return all.filter((z) => z.category === categoryFilter);
  }, [activePlot, categoryFilter]);

  const customPinJurisdiction = useMemo(() => {
    if (!customPin) return null;
    // Approximate nearest district heuristic for instant preview
    let nearest = "Dhaka";
    let minD = Infinity;
    const refs: Array<[string, number, number]> = [
      ["Dhaka", 23.81, 90.41],
      ["Gazipur", 24.0, 90.42],
      ["Narayanganj", 23.62, 90.5],
      ["Chattogram", 22.35, 91.78],
      ["Cox's Bazar", 21.43, 92.0],
      ["Khulna", 22.84, 89.54],
      ["Rajshahi", 24.37, 88.6],
      ["Sylhet", 24.89, 91.87],
      ["Barishal", 22.7, 90.35],
      ["Rangpur", 25.74, 89.27],
      ["Mymensingh", 24.74, 90.4],
    ];
    for (const [name, lat, lng] of refs) {
      const d = Math.hypot(customPin.lat - lat, customPin.lng - lng);
      if (d < minD) {
        minD = d;
        nearest = name;
      }
    }
    return {
      nearestDistrict: nearest,
      jurisdiction: detectJurisdiction({ division: "", district: nearest, upazilaOrArea: "" }),
    };
  }, [customPin]);

  // Initialize & manage Live OpenStreetMap / Esri Satellite Leaflet Map
  useEffect(() => {
    if (provider !== "live-osm" || !mapContainerRef.current) return;

    // Clean existing instance if switching providers
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: BANGLADESH_CENTER,
      zoom: 7,
      minZoom: 6,
      maxZoom: 19,
    });

    const tileUrl =
      baseStyle === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const tileLayer = L.tileLayer(tileUrl, {
      attribution:
        baseStyle === "satellite"
          ? "Imagery &copy; Esri"
          : "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const markerGroup = L.layerGroup().addTo(map);

    map.on("click", (ev: L.LeafletMouseEvent) => {
      const { lat, lng } = ev.latlng;
      setCustomPin({ lat, lng, label: "Dropped Bangladesh Site Pin" });
      setSelectedZone(null);
    });

    leafletMapRef.current = map;
    leafletTileRef.current = tileLayer;
    leafletMarkersRef.current = markerGroup;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [provider]);

  // Update Leaflet tile layer when switching Street <-> Satellite
  useEffect(() => {
    if (provider !== "live-osm" || !leafletMapRef.current) return;
    if (leafletTileRef.current) {
      leafletMapRef.current.removeLayer(leafletTileRef.current);
    }
    const tileUrl =
      baseStyle === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    leafletTileRef.current = L.tileLayer(tileUrl, {
      attribution: baseStyle === "satellite" ? "Imagery &copy; Esri" : "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(leafletMapRef.current);
  }, [baseStyle, provider]);

  // Render markers on Leaflet
  useEffect(() => {
    if (provider !== "live-osm" || !leafletMarkersRef.current) return;
    const group = leafletMarkersRef.current;
    group.clearLayers();

    for (const z of visibleZones) {
      const color = CATEGORY_COLORS[z.category];
      const marker = L.circleMarker([z.lat, z.lng], {
        radius: z.id === "active-plot-pin" ? 9 : 7,
        fillColor: color,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
      });

      marker.bindTooltip(`${z.name} (${z.authority})`, { direction: "top" });
      marker.on("click", () => {
        setSelectedZone(z);
        setCustomPin(null);
      });
      marker.addTo(group);
    }

    if (customPin) {
      const pin = L.circleMarker([customPin.lat, customPin.lng], {
        radius: 9,
        fillColor: "#111827",
        color: "#38bdf8",
        weight: 3,
        fillOpacity: 1,
      });
      pin.bindTooltip("Selected Custom Plot Pin", { permanent: false }).addTo(group);
    }
  }, [visibleZones, customPin, provider]);

  // Google Maps JS API Integration (when Google Maps mode selected & key available)
  useEffect(() => {
    if (provider !== "google-maps" || !mapContainerRef.current) return;
    if (!effectiveGoogleKey) {
      setGoogleError("No Google Maps API key configured. Using Live OpenStreetMap is available anytime.");
      return;
    }

    let cancelled = false;
    setGoogleError(null);

    const initGMap = () => {
      if (cancelled || !mapContainerRef.current || !window.google?.maps) return;
      const gmap = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: BANGLADESH_CENTER[0], lng: BANGLADESH_CENTER[1] },
        zoom: 7,
        mapTypeId: baseStyle === "satellite" ? "hybrid" : "roadmap",
      });
      gmap.addListener("click", (e: any) => {
        if (!e.latLng) return;
        setCustomPin({ lat: e.latLng.lat(), lng: e.latLng.lng(), label: "Google Maps Pin" });
        setSelectedZone(null);
      });
      googleMapRef.current = gmap;
    };

    if (window.google?.maps) {
      initGMap();
    } else {
      const existing = document.getElementById("gmaps-sdk-script");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "gmaps-sdk-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(effectiveGoogleKey)}&v=weekly`;
        script.async = true;
        script.onload = initGMap;
        script.onerror = () =>
          setGoogleError("Failed to load Google Maps API. Verify key restrictions or switch to Live OpenStreetMap.");
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", initGMap);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [provider, effectiveGoogleKey, baseStyle]);

  // Sync markers on Google Map
  useEffect(() => {
    if (provider !== "google-maps" || !googleMapRef.current || !window.google?.maps) return;
    googleMarkersRef.current.forEach((m) => m.setMap(null));
    googleMarkersRef.current = [];

    for (const z of visibleZones) {
      const marker = new window.google.maps.Marker({
        position: { lat: z.lat, lng: z.lng },
        map: googleMapRef.current,
        title: `${z.name} (${z.authority})`,
      });
      marker.addListener("click", () => {
        setSelectedZone(z);
        setCustomPin(null);
      });
      googleMarkersRef.current.push(marker);
    }
  }, [visibleZones, provider]);

  const flyToLocation = (coords: [number, number], zoom: number) => {
    if (provider === "live-osm" && leafletMapRef.current) {
      leafletMapRef.current.flyTo(coords, zoom, { duration: 0.9 });
    } else if (provider === "google-maps" && googleMapRef.current) {
      googleMapRef.current.panTo({ lat: coords[0], lng: coords[1] });
      googleMapRef.current.setZoom(zoom);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomPin({ lat, lng, label: "Your Live GPS Location" });
        setSelectedZone(null);
        flyToLocation([lat, lng], 15);
        toast.success(`Centered on live GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      },
      () => {
        toast.warning("Location permission denied — centering on Dhaka.");
        flyToLocation([23.8103, 90.4125], 12);
      }
    );
  };

  const handleSearchPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=bd&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (data.length > 0) {
        const lat = Number(data[0].lat);
        const lng = Number(data[0].lon);
        setCustomPin({ lat, lng, label: data[0].display_name });
        setSelectedZone(null);
        flyToLocation([lat, lng], 14);
        toast.success(`Found: ${data[0].display_name.split(",")[0]}`);
      } else {
        toast.warning(`No location found in Bangladesh for "${q}"`);
      }
    } catch {
      toast.error("Search network unavailable — try clicking a division button or directly on the map.");
    } finally {
      setSearching(false);
    }
  };

  const sendToPlotAnalyzer = (lat: number, lng: number, district: string, area: string) => {
    runPlotAnalysis({
      ...activePlot.input,
      district,
      upazilaOrArea: area,
      coordinates: { lat, lng },
      plotAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    });
    toast.success(`Synced (${district}) coordinates to Plot Analysis`);
    navigate("/plot-analysis");
  };

  const saveGoogleKey = () => {
    const trimmed = keyDraft.trim();
    if (trimmed) {
      localStorage.setItem("plancheck_gmaps_key", trimmed);
      setCustomGoogleKey(trimmed);
      setProvider("google-maps");
      setShowKeyBox(false);
      toast.success("Google Maps API key saved locally");
    } else {
      localStorage.removeItem("plancheck_gmaps_key");
      setCustomGoogleKey("");
      setProvider("live-osm");
      setShowKeyBox(false);
    }
  };

  return (
    <AppShell
      title="Bangladesh Live Map & Development Zones"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowKeyBox((v) => !v)}>
            <KeyRound className="size-3.5" /> Google Maps Key
          </Button>
          <Button size="sm" onClick={handleLocateMe}>
            <LocateFixed className="size-3.5" /> My Live Location
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-[1480px] space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              Bangladesh Live Map — Projects, Buildings, Malls &amp; Garments
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Full-country interactive live map with Google Maps API &amp; OpenStreetMap/Satellite support. Click any zone or drop a pin anywhere in Bangladesh to check development suitability and authority.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border bg-secondary/50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setProvider("live-osm")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                provider === "live-osm" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Live Map (OSM)
            </button>
            <button
              type="button"
              onClick={() => setProvider("google-maps")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                provider === "google-maps" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Google Maps API
            </button>
          </div>
        </div>

        {showKeyBox && (
          <Card className="border-primary/30">
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 text-xs">
              <div className="flex-1">
                <p className="font-semibold text-foreground">Configure Google Maps JavaScript API Key</p>
                <p className="text-muted-foreground">
                  Paste your Google Maps API key (or set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="font-mono">.env.local</code>). Stored locally in your browser.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="AIzaSy..."
                  className="h-8 w-64 font-mono text-xs"
                />
                <Button size="sm" className="h-8" onClick={saveGoogleKey}>
                  Save &amp; Switch
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <RegulatoryDisclaimerBanner text="Zone pins show illustrative development clusters across Bangladesh (Residential, Shopping Malls, RMG/Garments, Active Projects). Always verify parcel-level mouza/DAP zoning and DoE/FSCD clearances with the local authority before construction." />

        {/* Search, Category Filter & Division Quick-Jump Bar */}
        <div className="flex flex-col gap-2.5 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <form onSubmit={handleSearchPlace} className="flex flex-1 min-w-[240px] max-w-md items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search anywhere in Bangladesh (e.g. Mirpur 10, Agrabad, Gazipur)..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={searching}>
                {searching ? "Finding..." : "Go"}
              </Button>
            </form>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: "all", label: "All Zones", icon: Globe },
                { id: "project", label: "Projects", icon: FolderKanban },
                { id: "residential", label: "Buildings / Housing", icon: Building2 },
                { id: "mall", label: "Malls / Commercial", icon: ShoppingBag },
                { id: "garment", label: "Garments / RMG", icon: Factory },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id as ZoneCategory)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? "border-foreground bg-foreground text-background"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <cat.icon className="size-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Division Quick-Jump + Street/Satellite */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Jump:</span>
              {QUICK_DIVISIONS.map((div) => (
                <button
                  key={div.label}
                  type="button"
                  onClick={() => flyToLocation(div.coords, div.zoom)}
                  className="rounded border bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary"
                >
                  {div.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Layers className="size-3.5 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setBaseStyle("street")}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  baseStyle === "street" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                Street Map
              </button>
              <button
                type="button"
                onClick={() => setBaseStyle("satellite")}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  baseStyle === "satellite" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                Live Satellite
              </button>
            </div>
          </div>
        </div>

        {/* Map Canvas + Side Inspector */}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Live Interactive Map Container */}
          <div className="relative overflow-hidden rounded-xl border bg-card shadow-card">
            {provider === "google-maps" && !effectiveGoogleKey ? (
              <div className="flex h-[540px] flex-col items-center justify-center p-6 text-center space-y-3 bg-cad-grid">
                <Globe className="size-10 text-primary" />
                <h3 className="text-base font-semibold">Google Maps API Key Not Configured</h3>
                <p className="max-w-md text-xs text-muted-foreground">
                  {googleError || "Add your Google Maps JavaScript API key above, or switch instantly to Live OpenStreetMap + Satellite (free, no key needed, covers all 64 districts of Bangladesh)."}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setProvider("live-osm")}>
                    Switch to Live Bangladesh Map (OSM)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowKeyBox(true)}>
                    Enter Google Key
                  </Button>
                </div>
              </div>
            ) : (
              <div ref={mapContainerRef} className="h-[540px] w-full z-10" />
            )}

            {/* Legend Overlay */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-secondary/40 px-3.5 py-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-3">
                {(Object.keys(CATEGORY_LABELS) as Array<Exclude<ZoneCategory, "all">>).map((cat) => (
                  <span key={cat} className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                    {CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>
              <span className="font-mono text-muted-foreground">Click anywhere on the map to drop a site pin</span>
            </div>
          </div>

          {/* Right Inspector Panel */}
          <div className="space-y-4">
            {selectedZone ? (
              <Card>
                <CardHeader className="pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[selectedZone.category] }}
                    >
                      {CATEGORY_LABELS[selectedZone.category]}
                    </span>
                    <span className="font-mono text-xs font-semibold text-primary">{selectedZone.authority}</span>
                  </div>
                  <CardTitle className="mt-1.5 text-base">{selectedZone.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedZone.area}, {selectedZone.district} ·{" "}
                    <span className="font-mono">
                      {selectedZone.lat.toFixed(4)}° N, {selectedZone.lng.toFixed(4)}° E
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="rounded-md border bg-secondary/40 p-2.5">
                    <p className="font-semibold text-foreground">Permitted / Typical Development</p>
                    <p className="mt-0.5 text-muted-foreground">{selectedZone.allowedTypes}</p>
                  </div>
                  <div className="rounded-md border bg-secondary/40 p-2.5">
                    <p className="font-semibold text-foreground">Road &amp; Access Context</p>
                    <p className="mt-0.5 text-muted-foreground">{selectedZone.roadRequirement}</p>
                  </div>
                  <div className="rounded-md border border-border p-2.5 text-muted-foreground">
                    <strong className="text-foreground">Regulatory Guidance: </strong>
                    {selectedZone.notes}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={() =>
                        sendToPlotAnalyzer(selectedZone.lat, selectedZone.lng, selectedZone.district, selectedZone.area)
                      }
                    >
                      <MapPin className="size-3.5" /> Analyze Plot
                    </Button>
                    <Button size="sm" variant="outline" className="w-full text-xs" asChild>
                      <Link to="/cad-studio">
                        <Compass className="size-3.5" /> Design in CAD
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : customPin && customPinJurisdiction ? (
              <Card>
                <CardHeader className="pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase text-background">
                      Custom Dropped Pin
                    </span>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {customPinJurisdiction.jurisdiction.authority}
                    </span>
                  </div>
                  <CardTitle className="mt-1.5 text-base">{customPin.label}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {customPin.lat.toFixed(5)}° N, {customPin.lng.toFixed(5)}° E
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="rounded-md border bg-secondary/40 p-2.5">
                    <p className="font-semibold text-foreground">Estimated Nearest Authority</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {customPinJurisdiction.jurisdiction.authorityName} ({customPinJurisdiction.nearestDistrict})
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-primary">
                      {customPinJurisdiction.jurisdiction.seismicZone.label}
                    </p>
                  </div>
                  <div className="rounded-md border p-2.5 text-muted-foreground">
                    <strong className="text-foreground">Zoning Check Reminder:</strong> Confirm Mouza / DAP block before assuming Residential, Mall, or Garment factory permission.
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={() =>
                      sendToPlotAnalyzer(customPin.lat, customPin.lng, customPinJurisdiction.nearestDistrict, "")
                    }
                  >
                    <Navigation className="size-3.5" /> Send Pin to Plot Analyzer
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {/* Scrollable Zone Directory */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Development Zones ({visibleZones.length})</CardTitle>
                <CardDescription className="text-xs">Click any zone to fly the live map there.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[260px] overflow-y-auto space-y-1.5 pr-2">
                {visibleZones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => {
                      setSelectedZone(z);
                      setCustomPin(null);
                      flyToLocation([z.lat, z.lng], 13);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors ${
                      selectedZone?.id === z.id ? "border-foreground bg-secondary/70" : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[z.category] }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{z.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{z.district} · {z.area}</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] font-semibold text-muted-foreground">
                      {z.authority}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
