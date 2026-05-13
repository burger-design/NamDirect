import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

export function GoogleMapsWrapper({ children }: { children: React.ReactNode }) {
  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-4">Google Maps API Key Required</h2>
          <p className="text-sm text-gray-600 mb-6">
            To enable delivery maps and GPS features, please add your Google Maps API key as a secret.
          </p>
          <div className="text-left bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Instructions</h3>
            <ol className="text-sm space-y-2 list-decimal list-inside text-gray-700">
              <li>Get an API key from Google Cloud Console.</li>
              <li>Open <strong>Settings</strong> (⚙️) in AI Studio.</li>
              <li>Go to <strong>Secrets</strong>.</li>
              <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code>.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
      {children}
    </APIProvider>
  );
}
