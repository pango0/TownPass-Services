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
    title: string;
}

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

export async function fetchTrashCarData(k: number, lat: number, long: number): Promise<TrashCarData[]> {
  try {
    const queryParams = new URLSearchParams({
        latitude: lat,
        longitude: long,
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

export async function getNearestTrashCarLocations(k: number, lat: number, long: number): Promise<TrashCarData[] | null> {
  try {
    const trashCarData = await fetchTrashCarData(k, lat, long);

    if (trashCarData.length === 0) {
      return null;
    }
    return trashCarData;
  } catch (error) {
    console.error('Error finding nearest trash car locations:', error);
    return null;
  }
}
