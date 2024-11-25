"use client";
import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { LatLng, Icon } from "leaflet";
import markerIcon from "../public/marker.png";

interface MarkerData {
    id: number;
    position: LatLng;
}

interface MapComponentProps {
    markers: MarkerData[];
    onMapClick: (latlng: LatLng) => void;
}

const customIcon = new Icon({
    iconUrl: markerIcon.src,
    iconSize: [40, 40],
});

function MapEvents({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
    const map = useMapEvents({
        click(e) {
            onMapClick(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });
    return null;
}

export default function MapComponent({ markers, onMapClick }: MapComponentProps) {
    return (
        <MapContainer
        
            center={[50, 19]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full"
            style={{ height: "50vh", width: "80vh" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents onMapClick={onMapClick} />
            {markers.map((marker) => (
                <Marker key={marker.id} position={marker.position} icon={customIcon}>
                    <Popup>
                        Lat: {marker.position.lat.toFixed(4)}
                        <br />
                        Lng: {marker.position.lng.toFixed(4)}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
