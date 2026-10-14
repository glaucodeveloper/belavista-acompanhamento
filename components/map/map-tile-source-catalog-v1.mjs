/** Build the map's original remote and generated raster tile-source catalog. */
export const createMapTileSourceCatalogV1 = ({
  runtimeRouteV1,
  generatedAerialAsset,
  generatedAerialVersion,
} = {}) => ({
  satellite: [
    {
      id: "satellite",
      url: (z, x, y) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    },
    {
      id: "satellite-alt",
      url: (z, x, y) =>
        `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    },
  ],
  osm: [
    {
      id: "osm",
      url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    },
    {
      id: "osm-de",
      url: (z, x, y) => `https://tile.openstreetmap.de/${z}/${x}/${y}.png`,
    },
  ],
  generated: [
    {
      id: "dwg-satellite-treated-v5411",
      url: () => runtimeRouteV1(generatedAerialAsset, "v=" + generatedAerialVersion),
    },
  ],
});
