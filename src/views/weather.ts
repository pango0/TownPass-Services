// weather.ts

// Interface for the weather forecast data
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

export async function fetchWeatherData(locationName: string): Promise<BotResponse> {
    const locationWeatherUrls: { [key: string]: string } = {
        "大安區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%A4%A7%E5%AE%89%E5%8D%80&elementName=WeatherDescription',
    "中正區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E4%B8%AD%E6%AD%A3%E5%8D%80&elementName=WeatherDescription',
    "北投區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%8C%97%E6%8A%95%E5%8D%80&elementName=WeatherDescription',
    "士林區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%A3%AB%E6%9E%97%E5%8D%80&elementName=WeatherDescription',
    "內湖區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%85%A7%E6%B9%96%E5%8D%80&elementName=WeatherDescription',
    "中山區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E4%B8%AD%E5%B1%B1%E5%8D%80&elementName=WeatherDescription',
    "大同區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%A4%A7%E5%90%8C%E5%8D%80&elementName=WeatherDescription',
    "松山區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E6%9D%BE%E5%B1%B1%E5%8D%80&elementName=WeatherDescription',
    "南港區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%8D%97%E6%B8%AF%E5%8D%80&elementName=WeatherDescription',
    "萬華區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E8%90%AC%E8%8F%AF%E5%8D%80&elementName=WeatherDescription',
    "信義區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E4%BF%A1%E7%BE%A9%E5%8D%80&elementName=WeatherDescription',
    "文山區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E6%96%87%E5%B1%B1%E5%8D%80&elementName=WeatherDescription'
    };

    const weatherUrl = locationWeatherUrls[locationName];
    if (!weatherUrl) {
        return {
            message: `Sorry, I couldn't find weather data for the location: ${locationName}.`
        };
    }

    try {
        const response = await fetch(weatherUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data: WeatherForecast = await response.json();

        // 找到 WeatherDescription element，並檢查是否存在
        const weatherElement = data.records.locations[0].location[0].weatherElement.find(
            (element) => element.elementName === 'WeatherDescription'
        );

        if (!weatherElement) {
            return {
                message: `No weather description data found for ${locationName}.`
            };
        }

        // 組合天氣預報訊息
        const weatherDetails = weatherElement.time.map((time) => {
            const startTime = time.startTime;
            const endTime = time.endTime;
            const weatherDescription = time.elementValue[0].value;

            return `From ${startTime} to ${endTime}, the weather is expected to be: ${weatherDescription}.`;
        }).join('\n');

        return {
            message: weatherDetails,
            data: data
        };
    } catch (error) {
        console.error('Failed to fetch or process weather data:', error);
        return {
            message: 'Sorry, I could not fetch the weather data. Please try again later.'
        };
    }
}