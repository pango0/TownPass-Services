export interface YouBikeData {
  sno: string;
  sna: string;
  total: number;
  available_rent_bikes: number;
  sarea: string;
  mday: string;
  latitude: number;
  longitude: number;
  ar: string;
  sareaen: string;
  snaen: string;
  aren: string;
  available_return_bikes: number;
  act: string;
  srcUpdateTime: string;
  updateTime: string;
  infoTime: string;
  infoDate: string;
}

export interface YouBikeDataWithDistance extends YouBikeData {
  distance: number;
  latitude: number;
  longitude: number;
  title: string;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function fetchYouBikeDataWithDistance(lat:number, long:number): Promise<YouBikeDataWithDistance[]> {
  const url = 'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json';

  try {

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const data: YouBikeData[] = await response.json();

    const dataWithDistance: YouBikeDataWithDistance[] = data.map((station) => ({
      ...station,
      sna: station.sna.slice('YouBike2.0_'.length),
      distance: getDistance(lat!, long!, station.latitude, station.longitude),
      title: station.sna.slice('YouBike2.0_'.length),
      latitude: station.latitude,
      longitude: station.longitude
    }));

    return dataWithDistance;
  } catch (error) {
    console.error('Failed to fetch or parse data:', error);
    return [];
  }
}

export async function getNearestRentableStation(
  k: number, lat: number, long: number
): Promise<YouBikeDataWithDistance[] | null> {
  try {
    const stations = await fetchYouBikeDataWithDistance(lat, long);

    const rentableStations = stations.filter((station) => station.available_rent_bikes > 0);

    if (rentableStations.length === 0) {
      return null;
    }

    const sortedStations = rentableStations.sort((a, b) => a.distance - b.distance);

    return sortedStations.slice(0, k);
  } catch (error) {
    console.error('Error finding nearest rentable station:', error);
    return null;
  }
}

export async function getNearestReturnableStation(
  k: number, lat: number, long: number
): Promise<YouBikeDataWithDistance[] | null> {
  try {
    const stations = await fetchYouBikeDataWithDistance(lat, long);

    const returnableStations = stations.filter((station) => station.available_return_bikes > 0);

    if (returnableStations.length === 0) {
      return null;
    }

    const sortedStations = returnableStations.sort((a, b) => a.distance - b.distance);

    return sortedStations.slice(0, k);
  } catch (error) {
    console.error('Error finding nearest returnable stations:', error);
    return null;
  }
}
