export interface MetroData {
    StationUID: string;
    StationID: string;
    StationName: {
        Zh_tw: string;
        En: string;
    };
    StationAddress: string;
    BikeAllowOnHoliday: number;
    SrcUpdateTime: string;
    UpdateTime: string;
    VersionID: number;
    StationPosition: {
        PositionLon: number;
        PositionLat: number;
        GeoHash: string;
    };
    LocationCity: string;
    LocationCityCode: string;
    LocationTown: string;
    LocationTownCode: string;
}

export interface MetroDataWithDistance extends MetroData{
    distance: number;
    latitude: number;
    longitude: number;
}

let userLatitude: number | null = null;
let userLongitude: number | null = null;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function initGeolocation(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLatitude = position.coords.latitude;
                    userLongitude = position.coords.longitude;
                    resolve();
                },
                (error) => {
                    reject(error);
                }
            );
        } else {
            reject(new Error("Geolocation is not supported by this browser."));
        }
    });
}

export async function fetchMetroData(): Promise<MetroDataWithDistance[]> {
    const url = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/TRTC';

    try {
        await initGeolocation();

        if (userLatitude === null || userLongitude === null) {
            throw new Error("Unable to get user location");
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data: MetroData[] = await response.json();

        const dataWithDistance: MetroDataWithDistance[] = data.map(station => ({
            ...station,
            distance: getDistance(userLatitude!, userLongitude!, station.StationPosition.PositionLat, station.StationPosition.PositionLon),
            latitude: station.StationPosition.PositionLat,
            longitude: station.StationPosition.PositionLon,
        }));
        return dataWithDistance
    } catch (error) {
        console.error('Failed to fetch or parse data:', error);
        return [];
    }
}

export async function getNearestMetroStation(k: number): Promise<(MetroDataWithDistance)[] | null> {
    try {
        const stations = await fetchMetroData();

        if (stations.length === 0) {
            return null;
        }

        const sortedStations = stations.sort((a, b) => a.distance - b.distance);

        return sortedStations.slice(0, k);
    } catch (error) {
        console.error('Error finding nearest returnable station:', error);
        return null;
    }
}