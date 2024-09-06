export interface WeatherForecast {
    success: string;
    result: {
        resource_id: string;
        fields: Array<{
            id: string;
            type: string;
        }>;
    };
    records: {
        locations: Array<{
            datasetDescription: string;
            locationsName: string;
            dataid: string;
            location: Array<{
                locationName: string;
                geocode: string;
                lat: string;
                lon: string;
                weatherElement: Array<{
                    elementName: string;
                    description: string;
                    time: Array<{
                        startTime: string;
                        endTime: string;
                        elementValue: Array<{
                            value: string;
                            measures: string;
                        }>;
                    }>;
                }>;
            }>;
        }>;
    };
}

// The response format for the chatbot
export interface BotResponse {
    message: string;
    data?: any;
}

// Example function to fetch weather data and prepare a chatbot-friendly response
export async function fetchWeatherData(): Promise<BotResponse> {
    const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%A4%A7%E5%AE%89%E5%8D%80&elementName=WeatherDescription'; // Replace with actual API endpoint

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data: WeatherForecast = await response.json();

        // Process the weather data
        const weatherDetails = data.records.locations.map((locationSet) => {
            return locationSet.location.map((location) => {
                const locationName = location.locationName;
                const weatherElement = location.weatherElement.find(
                    (element) => element.elementName === 'WeatherDescription'
                );

                const forecastTimes = weatherElement?.time.map((time) => {
                    const startTime = time.startTime;
                    const endTime = time.endTime;
                    const weatherDescription = time.elementValue[0].value;

                    return `From ${startTime} to ${endTime}, the weather in ${locationName} is expected to be: ${weatherDescription}.`;
                });

                return forecastTimes?.join('\n') || `No weather data available for ${locationName}.`;
            }).join('\n');
        }).join('\n');

        const responseMessage = weatherDetails;

        // Return structured data for the chatbot
        return {
            message: responseMessage,
            data: data // Optionally include raw data for further processing
        };
    } catch (error) {
        console.error('Failed to fetch or process weather data:', error);
        return {
            message: 'Sorry, I could not fetch the weather data. Please try again later.'
        };
    }
}
