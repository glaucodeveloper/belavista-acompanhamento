import { runtimeRouteV1 } from "../shared/routing.mjs";
import * as atlasMapModelCacheTsV1 from "../../dist/frontend/components.js";

// BELAVISTA_MODEL_CLIENT_CACHE_V14
// O GLB principal é baixado uma vez e salvo no Cache Storage do navegador.
// O cache usa uma chave estável SEM o token ?key= da rota ngrok.
export const CLIENT_MODEL_ASSET_V14 =
  "/assets/model/alianca_park_masterplan_preview.glb";
const CLIENT_MODEL_CACHE_NAME_V14 = "belavista-3d-models-v15";
const CLIENT_MODEL_CACHE_VERSION_V14 = "alianca-masterplan-client-v15";

const clientModelCacheKeyV14 = () => {
  const currentPath = String(globalThis.location?.pathname || ""),
    embeddedPrefix = currentPath.match(/^\/(\d{2,5})(?=\/|$)/)?.[0] || "",
    host = String(globalThis.location?.hostname || ""),
    tunnelPrefix = embeddedPrefix || (/ngrok/i.test(host) ? "/8080" : ""),
    origin = String(globalThis.location?.origin || "");

  return `${origin}${tunnelPrefix}${CLIENT_MODEL_ASSET_V14}?client-cache=${CLIENT_MODEL_CACHE_VERSION_V14}`;
};

const requestClientModelPersistentStorageV14 = async () => {
  if (!globalThis.navigator?.storage?.persist) return false;

  try {
    const alreadyPersistent =
      (await globalThis.navigator.storage.persisted?.()) === true;
    if (alreadyPersistent) return true;

    return (await globalThis.navigator.storage.persist()) === true;
  } catch {
    return false;
  }
};

const getClientCachedModelBufferV14 = async (fetchUrl, onProgress) => {
  const absoluteFetchUrl = new URL(
      String(fetchUrl || CLIENT_MODEL_ASSET_V14),
      globalThis.location?.href,
    ).href,
    stableCacheKey = clientModelCacheKeyV14();

  let cache = null,
    response = null,
    source = "network";

  if ("caches" in globalThis) {
    try {
      cache = await globalThis.caches.open(CLIENT_MODEL_CACHE_NAME_V14);
      response = await cache.match(stableCacheKey);
      if (response) source = "cache-storage";
    } catch (error) {
      console.warn("[Belavista] Cache Storage indisponível para o GLB.", error);
    }
  }

  if (!response) {
    response = await fetch(absoluteFetchUrl, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok)
      throw new Error(`Falha ao baixar modelo 3D (${response.status})`);

    if (cache) {
      try {
        // Salva sob chave estável; não persiste o ?key= usado pelo ngrok.
        await cache.put(stableCacheKey, response.clone());
      } catch (error) {
        console.warn(
          "[Belavista] Modelo carregou, mas não pôde ser persistido no Cache Storage.",
          error,
        );
      }
    }
  }

  const buffer = await response.arrayBuffer(),
    bytes = buffer.byteLength;

  onProgress?.({
    loaded: bytes,
    total: bytes,
    lengthComputable: true,
    clientCacheSource: source,
  });

  globalThis.__BELAVISTA_MODEL_CLIENT_CACHE_V14__ = {
    cacheName: CLIENT_MODEL_CACHE_NAME_V14,
    cacheKey: stableCacheKey,
    source,
    bytes,
    ready: true,
  };

  if (globalThis.document?.documentElement) {
    document.documentElement.dataset.model3dClientCacheV14 = source;
    document.documentElement.dataset.model3dClientCacheBytesV14 = String(bytes);
  }

  return {
    buffer,
    source,
    fetchUrl: absoluteFetchUrl,
  };
};

const loadGlbWithClientCacheLegacyV14 = (
  loader,
  url,
  onLoad,
  onProgress,
  onError,
) => {
  getClientCachedModelBufferV14(url, onProgress)
    .then(({ buffer, fetchUrl }) => {
      const basePath = new URL("./", fetchUrl).href;

      loader.parse(
        buffer,
        basePath,
        (gltf) => {
          try {
            onLoad?.(gltf);
          } catch (error) {
            onError?.(error);
          }
        },
        (error) => onError?.(error),
      );
    })
    .catch((error) => onError?.(error));
};

export const loadGlbWithClientCacheV14 = (...args) => {
  const owner = atlasMapModelCacheTsV1.loadAtlasMapGlbWithClientCacheV1;
  return typeof owner === "function"
    ? owner(...args)
    : loadGlbWithClientCacheLegacyV14(...args);
};

const preloadClientModelLegacyV14 = async () => {
  if (globalThis.__BELAVISTA_MODEL_CLIENT_PRELOAD_V14__)
    return globalThis.__BELAVISTA_MODEL_CLIENT_PRELOAD_V14__;

  globalThis.__BELAVISTA_MODEL_CLIENT_PRELOAD_V14__ = (async () => {
    const persistent = await requestClientModelPersistentStorageV14();

    if (globalThis.document?.documentElement)
      document.documentElement.dataset.model3dPersistentStorageV14 = persistent
        ? "granted"
        : "best-effort";

    const fetchUrl = runtimeRouteV1(
      CLIENT_MODEL_ASSET_V14,
      `v=${CLIENT_MODEL_CACHE_VERSION_V14}`,
    );

    try {
      const result = await getClientCachedModelBufferV14(fetchUrl);

      if (globalThis.document?.documentElement)
        document.documentElement.dataset.model3dPreloadV14 = "ready";

      return result;
    } catch (error) {
      if (globalThis.document?.documentElement)
        document.documentElement.dataset.model3dPreloadV14 = "failed";

      console.warn("[Belavista] Pré-cache do modelo 3D não concluído.", error);
      throw error;
    }
  })();

  return globalThis.__BELAVISTA_MODEL_CLIENT_PRELOAD_V14__;
};

export const preloadClientModelV14 = (...args) => {
  const owner = atlasMapModelCacheTsV1.preloadAtlasMapModelClientCacheV1;
  return typeof owner === "function"
    ? owner(...args)
    : preloadClientModelLegacyV14(...args);
};
