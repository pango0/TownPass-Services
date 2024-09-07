export interface ParkingData {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  carSpaces: number | null;
  motorcycleSpaces: number | null;
  bicycleSpaces: number | null;
}

export interface ParkingDataWithDistance extends ParkingData {
  distance: number;
  latitude: number;
  longitude: number;
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

export async function fetchParkingDataWithDistance(): Promise<ParkingDataWithDistance[]> {
  const url =
    'https://data.taipei/api/v1/dataset/74cfc01d-242f-428d-bc2f-caf5edd6e404?scope=resourceAquire';

  try {
    await initGeolocation();

    if (userLatitude === null || userLongitude === null) {
      throw new Error('Unable to get user location');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const data = await response.json();

    const parkingData: ParkingData[] = data.result.results.map((entry: any) => {
      const [id, name, lat, lng, carSpaces, motorcycleSpaces, bicycleSpaces] =
        entry['項次\t停車場名稱\t緯度\t經度\t小汽車\t機車\t自行車'].split('\t');

      return {
        id: parseInt(id, 10),
        name,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        carSpaces: carSpaces ? parseInt(carSpaces, 10) : null,
        motorcycleSpaces: motorcycleSpaces ? parseInt(motorcycleSpaces, 10) : null,
        bicycleSpaces: bicycleSpaces ? parseInt(bicycleSpaces, 10) : null
      };
    });

    const dataWithDistance: ParkingDataWithDistance[] = parkingData.map((location) => ({
      ...location,
      distance: getDistance(userLatitude!, userLongitude!, location.latitude, location.longitude)
    }));

    return dataWithDistance;
  } catch (error) {
    console.error('Failed to fetch or parse data:', error);
    return [];
  }
}

export async function getNearestParkingLocations(
  k: number
): Promise<ParkingDataWithDistance[] | null> {
  try {
    const locations = await fetchParkingDataWithDistance();

    if (locations.length === 0) {
      return null;
    }

    const sortedLocations = locations.sort((a, b) => a.distance - b.distance);

    return sortedLocations.slice(0, k);
  } catch (error) {
    console.error('Error finding nearest parking locations:', error);
    return null;
  }
}
