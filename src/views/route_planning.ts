export interface TransitRoute {
  routes: any;
}

export async function getTransitRoute(
  origin: string,
  destination: string,
  mode: string,
  apiKey: string
): Promise<TransitRoute | null> {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch transit route:', error);
    return null;
  }
}
