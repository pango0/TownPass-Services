export interface TransitRoute {
  routes: any;
}

export async function getTransitRoute(
  origin: string,
  destination: string,
  mode: string,
  apiKey: string
): Promise<TransitRoute | null> {
  const queryParams = new URLSearchParams({
    origin,
    destination,
    mode,
    key: apiKey
  });
  const url = `http://localhost:3000/map?${queryParams.toString()}`;

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
