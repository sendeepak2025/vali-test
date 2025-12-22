// src/utils/loadGoogleMaps.ts
let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

export const loadGoogleMaps = (apiKey: string) => {
  if (window.google?.maps?.places && window.google?.maps?.DirectionsService) {
    return Promise.resolve();
  }

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      reject("Google Maps API key missing");
      return;
    }

    if (!scriptLoaded) {
      scriptLoaded = true;

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,directions`;
      script.async = true;

      script.onload = () => resolve();
      script.onerror = () => reject("Failed to load Google Maps API");

      document.body.appendChild(script);
    }
  });

  return scriptPromise;
};
