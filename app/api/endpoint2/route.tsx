import { fetchWeatherApi } from 'openmeteo';
import { NextResponse } from "next/server";



const url = "https://api.open-meteo.com/v1/forecast";

const range = (start: number, stop: number, step: number) =>
    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);


export async function GET(req: Request) {
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



    const params = {
        latitude: latitude,
        longitude: longitude,
        hourly: ["temperature_2m", "relative_humidity_2m", "precipitation_probability", "precipitation", "rain", "snowfall", "surface_pressure"],
        daily: "sunshine_duration"
    };

    try {
        const responses = await fetchWeatherApi(url, params);
        const response = responses[0];

        const hourly = response.hourly();
        if (!hourly) {
            return NextResponse.json(
                { error: "Hourly weather data is unavailable" },
                { status: 404 }
            );
        }
        const daily = response.daily()!;
        if (!daily) {
            return NextResponse.json(
                { error: "Daily weather data is unavailable" },
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
                surfacePressure: hourly.variables(6)!.valuesArray()!,
                precipitation: hourly.variables(3)!.valuesArray()!,
                rain: hourly.variables(4)!.valuesArray()!,
                snowfall: hourly.variables(5)!.valuesArray()!,
            },
            daily: {
                time: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
                    (t) => new Date((t + utcOffsetSeconds) * 1000)
                ),
                sunshineDuration: daily.variables(0)!.valuesArray()!,
            }
        };


        const avgSurfacePressure = weatherData.hourly.surfacePressure.reduce((sum, val) => sum + val, 0) / weatherData.hourly.surfacePressure.length;


        const avgSunshineDuration = weatherData.daily.sunshineDuration.reduce((sum, val) => sum + val, 0) / weatherData.daily.sunshineDuration.length;


        const minTemp = Math.min(...weatherData.hourly.temperature2m);
        const maxTemp = Math.max(...weatherData.hourly.temperature2m);

        const rainDays = weatherData.hourly.rain.filter(r => r > 0).length;
        const snowDays = weatherData.hourly.snowfall.filter(s => s > 0).length;
        const totalDays = weatherData.daily.sunshineDuration.length;

        let weatherSummary = "bez opadów";

        if (snowDays > rainDays && snowDays > totalDays / 2) {
            weatherSummary = "z opadami śniegu";
        } else if (rainDays > snowDays && rainDays > totalDays / 2) {
            weatherSummary = "z opadami deszczu";
        }

        const firstDay = new Date(weatherData.daily.time[0]).toISOString().split('T')[0];
        const lastDay = new Date(weatherData.daily.time[weatherData.daily.time.length - 1]).toISOString().split('T')[0];


        const result = {
            dateRange: `${firstDay} - ${lastDay}`,
            averagePressure: avgSurfacePressure.toFixed(2),
            averageSunshineDuration: (avgSunshineDuration / 3600).toFixed(2),
            extremeTemperatures: {
                minTemp,
                maxTemp
            },
            weatherSummary
        };

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("Error fetching weather data:", error);
        return NextResponse.json(
            { error: "Failed to fetch weather data" },
            { status: 500 }
        );
    }
}
