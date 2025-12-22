// src/components/GooglePlacesAutocomplete.tsx
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/utils/loadGoogleMaps";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
}

const GooglePlacesAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter location",
  className = "",
  name,
  required = false,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    loadGoogleMaps(apiKey)
      .then(() => {
        setReady(true);
        initAutocomplete();
      })
      .catch(() => {
        console.warn("Google Maps API failed → using fallback input");
        setFallback(true);
      });

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["geocode"],
        componentRestrictions: { country: ["us", "ca"] },
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      onChange(place.formatted_address || "");
    });
  };

  const handleManual = (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value);

  if (fallback) {
    return (
      <input
        type="text"
        value={value}
        onChange={handleManual}
        placeholder={placeholder}
        className={className}
        name={name}
        required={required}
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleManual}
        placeholder={placeholder}
        className={className}
        name={name}
        required={required}
        autoComplete="off"
      />

      {!ready && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
