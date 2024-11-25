
"use client";

import { useEffect, useState } from 'react';
import type { LatLngExpression } from 'leaflet';

interface MapProps {
    center: LatLngExpression;
    zoom: number;
}

export default function ClientMap({ center, zoom }: MapProps) {
    const [mapComponent, setMapComponent] = useState<JSX.Element | null>(null);

    useEffect(() => {
        // Only import and initialize the map on the client side
        const initializeMap = async () => {
            const L = (await import('leaflet')).default;
            const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');

            // Import the CSS


            // Set up the icon
            const icon = L.icon({
                iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            // Create the map component
            const map = (
                <div
                    className="h-[400px] w-full rounded-lg overflow-hidden"
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                >
                    <MapContainer
                        center={center}
                        zoom={zoom}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={center} icon={icon}>
                            <Popup>
                                Your location here
                            </Popup>
                        </Marker>
                    </MapContainer>
                </div>
            );

            setMapComponent(map);
        };

        // Initialize the map
        initializeMap();

        // Cleanup function
        return () => {
            setMapComponent(null);
        };
    }, [center, zoom]); // Re-initialize if center or zoom changes

    // Show loading state while map is initializing
    if (!mapComponent) {
        return (
            <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg" />
        );
    }

    return mapComponent;
}