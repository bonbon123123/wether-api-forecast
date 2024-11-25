"use client";
import React, { useState, useEffect, useMemo } from "react";
import { LatLng } from "leaflet";
import weatherCodes from './public/codes.json' assert { type: 'json' };

import dynamic from 'next/dynamic';
type WeatherCodes = Record<
  string,
  {
    day: { description: string; image: string };
    night: { description: string; image: string };
  }
>;



interface Endpoint1Data {
  date: string;
  code: number;
  minTemp: number;
  maxTemp: number;
  generatedEnergy: number;
}

interface Endpoint2Data {
  dateRange: string;
  averagePressure: string;
  averageSunshineDuration: string;
  extremeTemperatures: {
    minTemp: number;
    maxTemp: number;
  };
  weatherSummary: string;
}

interface MarkerData {
  id: number;
  position: LatLng;
}

export default function Home() {
  const [endpoint1, setEndpoint1] = useState<Endpoint1Data[] | undefined>();
  const [endpoint2, setEndpoint2] = useState<Endpoint2Data | undefined>();
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [isLoading, setIsLoading] = useState(false);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [isClient, setIsClient] = useState(false);

  const codes: WeatherCodes = weatherCodes;

  const toggleMode = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    document.documentElement.setAttribute("data-theme", newMode);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setMode(prefersDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  }, [isClient]);

  const fetchEndpoint1 = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/endpoint1?latitude=${lat}&longitude=${lng}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEndpoint1(data.data);
    } catch (error) {
      console.error("Error fetching endpoint1:", error);
      setEndpoint1(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEndpoint2 = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/endpoint2?latitude=${lat}&longitude=${lng}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEndpoint2(data.data);
    } catch (error) {
      console.error("Error fetching endpoint2:", error);
      setEndpoint2(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapClick = (latlng: LatLng) => {
    setMarkers([
      {
        id: Date.now(),
        position: latlng,
      },
    ]);
    fetchEndpoint1(latlng.lat, latlng.lng);
    fetchEndpoint2(latlng.lat, latlng.lng);
  };


  const MapComponent = useMemo(
    () =>
      dynamic(() => import("./components/MapComponent"), {
        loading: () => <p>A map is loading</p>,
        ssr: false,
      }),
    []
  );

  return (
    <div
      className="flex flex-col items-center justify-center py-1"
      style={{ background: "var(--background)", color: "var(--primary)" }}
    >
      <button
        onClick={toggleMode}
        className="mb-4 px-4 py-2 font-semibold rounded-lg absolute top-0 left-0"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--foreground)",
        }}
      >
        Switch to {mode === "light" ? "Dark" : "Light"} Mode
      </button>

      <div
        className="mb-1 rounded-t-lg overflow-hidden"
        style={{
          borderColor: "var(--border)",
        }}
      >
        {isClient && <MapComponent markers={markers} onMapClick={handleMapClick} />}

        {/* {isClient && (

        )} */}
      </div>



      <div className="w-full overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex justify-center">
            <p>Loading data...</p>
          </div>
        ) : endpoint1 ? (
          <table
            className="table-auto w-full border-collapse"

            style={{ border: "1px solid var(--border)", textAlign: "center" }}
          >
            <thead>
              <tr>
                <th style={{ border: "1px solid var(--border)" }}>Date</th>
                <th style={{ border: "1px solid var(--border)" }}>Weather</th>
                <th style={{ border: "1px solid var(--border)" }}>Max Temp (°C)</th>
                <th style={{ border: "1px solid var(--border)" }}>Min Temp (°C)</th>
                <th style={{ border: "1px solid var(--border)" }}>Energy (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {endpoint1.map((day, index) => (
                <tr key={index}>
                  <td style={{ border: "1px solid var(--border)" }}>{day.date}</td>
                  <td style={{ border: "1px solid var(--border)" }}>
                    {codes[day.code.toString()]?.day?.image ? (
                      <img
                        src={codes[day.code.toString()].day.image}
                        alt={codes[day.code.toString()].day.description}
                        className="w-12 h-12 mx-auto"
                        style={{ background: "var(--accent)" }}
                      />
                    ) : (
                      day.code
                    )}
                  </td>
                  <td style={{ border: "1px solid var(--border)" }}>{day.maxTemp}°C</td>
                  <td style={{ border: "1px solid var(--border)" }}>{day.minTemp}°C</td>
                  <td style={{ border: "1px solid var(--border)" }}>{day.generatedEnergy} kWh</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Click on the map to load forecast data.</p>
        )}
      </div>

      {endpoint2 && (
        <div className="p-6 mb-1 space-y-4">
          <h2 className="text-2xl font-semibold">Weekly Summary</h2>
          <div className="space-y-2">
            <p>
              <strong>Extreme Temperatures:</strong> Min Temp: {endpoint2.extremeTemperatures.minTemp}°C
              - Max Temp: {endpoint2.extremeTemperatures.maxTemp}°C
            </p>
            <p>
              <strong>Average Pressure:</strong> {endpoint2.averagePressure} hPa
            </p>
            <p>
              <strong>Average Sunshine Duration:</strong> {endpoint2.averageSunshineDuration} hours
            </p>
            <p>
              <strong>Weather Summary:</strong> {endpoint2.weatherSummary}
            </p>
          </div>
        </div>
      )}
    </div>


  );
}
