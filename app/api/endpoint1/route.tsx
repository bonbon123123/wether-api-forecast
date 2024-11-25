import { fetchWeatherApi } from 'openmeteo';
import { NextResponse } from "next/server";
const url = "https://api.open-meteo.com/v1/forecast";

const range = (start: number, stop: number, step: number) =>
    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);
const power_of_instalation = 2.5;
const efficiency = 0.2;

interface HourlyWeather {
    time: string;
    temperature: number;
    weatherCode: number;
}

interface DayPrepared {
    date: string;
    code: number;
    minTemp: number;
    maxTemp: number;
    generatedEnergy: number;
}

export async function GET(req: Request) {
    try {
        const urlParams = new URL(req.url).searchParams;

        const latitudeParam = urlParams.get('latitude');
        const longitudeParam = urlParams.get('longitude');

        if (!latitudeParam || !longitudeParam) {
            return NextResponse.json(
                { error: "Both latitude and longitude are required" },
                { status: 400 }
            );
        }

        const latitude = parseFloat(latitudeParam);
        const longitude = parseFloat(longitudeParam);


        if (isNaN(latitude) || isNaN(longitude) ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180) {
            return NextResponse.json(
                { error: "Invalid latitude or longitude" },
                { status: 400 }
            );
        }


        else {



            try {
                const params = {
                    latitude: latitude,
                    longitude: longitude,
                    hourly: ["temperature_2m", "weather_code"],
                    daily: "daylight_duration"
                };

                const responses = await fetchWeatherApi(url, params);
                const response = responses[0];

                const hourly = response.hourly();
                const daily = response.daily();

                if (!hourly || !daily) {
                    return NextResponse.json(
                        { error: "Weather data is unavailable" },
                        { status: 404 }
                    );
                }

                const utcOffsetSeconds = response.utcOffsetSeconds();

                const weatherData = {
                    hourly: {
                        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
                            (t) => new Date((t + utcOffsetSeconds) * 1000)
                        ),
                        temperature2m: hourly.variables(0)!.valuesArray()!,
                        weatherCode: hourly.variables(1)!.valuesArray()!,
                    },
                    daily: {
                        time: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
                            (t) => new Date((t + utcOffsetSeconds) * 1000)
                        ),
                        daylightDuration: daily.variables(0)!.valuesArray()!,
                    },
                };


                const formattedData = weatherData.hourly.time.map((time, index) => ({
                    time: time.toISOString(),
                    temperature: weatherData.hourly.temperature2m[index],
                    weatherCode: weatherData.hourly.weatherCode[index]
                }));

                const days: HourlyWeather[][] = [];
                for (let i = 0; i < 7; i++) {
                    const day: HourlyWeather[] = [];
                    for (let j = 0; j < 24; j++) {
                        const recordIndex = i * 24 + j;
                        if (recordIndex < formattedData.length) {
                            day.push(formattedData[recordIndex]);
                        }
                    }
                    days.push(day);
                }

                const days_prepared: DayPrepared[] = [];
                days.forEach((day, index) => {
                    const date = new Date(day[0].time).toISOString().split('T')[0];
                    const code = day[0].weatherCode;
                    let minTemp = day[0].temperature;
                    let maxTemp = day[0].temperature;
                    const daylightDuration = weatherData.daily.daylightDuration[index] / (60 * 60);

                    day.forEach(hour => {
                        minTemp = Math.min(minTemp, hour.temperature);
                        maxTemp = Math.max(maxTemp, hour.temperature);
                    });

                    days_prepared.push({
                        date,
                        code,
                        minTemp,
                        maxTemp,
                        generatedEnergy: power_of_instalation * daylightDuration * efficiency
                    });
                });

                return NextResponse.json({ data: days_prepared }, { status: 200 });

            } catch (error) {
                console.error("Error fetching weather data:", error);
                return NextResponse.json(
                    { error: "Failed to fetch weather data" },
                    { status: 500 }
                );
            }
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

