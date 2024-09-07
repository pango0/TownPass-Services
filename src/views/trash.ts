export interface TrashCarData {
    district: string;
    village: string;
    team: string;
    carNumber: number;
    route: string;
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

export async function fetchTrashCarData(k: number): Promise<TrashCarData[]> {
  try {
    await initGeolocation();

    if (userLatitude === null || userLongitude === null) {
      throw new Error('Unable to get user location');
    }

    const queryParams = new URLSearchParams({
        latitude: userLatitude,
        longitude: userLongitude,
        k: k,
    });

    const response = await fetch(`http://localhost:3000/trash?${queryParams.toString()}`);
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    const data: TrashCarData[] = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch trash car data:', error);
    return [];
  }
}

export async function getNearestTrashCarLocations(k: number): Promise<TrashCarData[] | null> {
  try {
    const trashCarData = await fetchTrashCarData(k);

    if (trashCarData.length === 0) {
      return null;
    }
    return trashCarData;
  } catch (error) {
    console.error('Error finding nearest trash car locations:', error);
    return null;
  }
}
