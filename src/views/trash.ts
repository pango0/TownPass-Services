export interface TrashCarData {
  routeName: string;
  location: string;
  latitude: number;
  longitude: number;
  arrivalTime: string;
  departureTime: string;
  distance: number;
}

let userLatitude: number | null = null;
let userLongitude: number | null = null;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
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
      reject(new Error('Geolocation is not supported by this browser.'));
    }
  });
}

function isTimeInFuture(departureTime: string): boolean {
  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];

  const [hours, minutes] = [
    parseInt(departureTime.slice(0, 2)),
    parseInt(departureTime.slice(2, 4))
  ];
  const departureDate = new Date(todayDateStr);
  departureDate.setHours(hours, minutes, 0);

  return departureDate > now;
}

export async function fetchTrashCarDataWithDistance(): Promise<TrashCarData[]> {
  const url =
    'https://data.taipei/api/v1/dataset/a6e90031-7ec4-4089-afb5-361a4efe7202?scope=resourceAquire';

  try {
    await initGeolocation();

    if (userLatitude === null || userLongitude === null) {
      throw new Error('Unable to get user location');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://data.taipei'
      }
    });
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    const data = await response.json();

    const trashCarData: TrashCarData[] = data.result.results
      .filter((entry: any) => isTimeInFuture(entry['離開時間']))
      .map((entry: any) => ({
        routeName: entry['路線'] || '',
        location: entry['地點'] || '',
        latitude: parseFloat(entry['經度']) || 0,
        longitude: parseFloat(entry['緯度']) || 0,
        arrivalTime: entry['抵達時間'] || '',
        departureTime: entry['離開時間'] || '',
        distance: getDistance(
          userLatitude!,
          userLongitude!,
          parseFloat(entry['緯度']),
          parseFloat(entry['經度'])
        )
      }));

    return trashCarData;
  } catch (error) {
    console.error('Failed to fetch trash car data:', error);
    return [];
  }
}

export async function getNearestTrashCarLocations(k: number): Promise<TrashCarData[] | null> {
  try {
    const trashCarData = await fetchTrashCarDataWithDistance();

    if (trashCarData.length === 0) {
      return null;
    }

    const sortedData = trashCarData.sort((a, b) => a.distance - b.distance).slice(0, k);

    return sortedData;
  } catch (error) {
    console.error('Error finding nearest trash car locations:', error);
    return null;
  }
}
