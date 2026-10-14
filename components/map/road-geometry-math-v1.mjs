// The lot frontage is approximately 10 m; road geometry is segmented by half
// that frontage so the generated plane follows the recorded centerline.
export const ROAD_HALF_LOT_SLICE_WORLD_V1 = 5;

/** Estimate the dominant planar direction of a traced road centerline. */
export const roadPlanarAngleV1 = (points, fallback = 0) => {
  const usable = Array.isArray(points)
    ? points.filter(
        (point) =>
          point && Number.isFinite(point.x) && Number.isFinite(point.z),
      )
    : [];
  if (usable.length < 4) return fallback;
  let meanX = 0;
  let meanZ = 0;
  usable.forEach((point) => {
    meanX += point.x;
    meanZ += point.z;
  });
  meanX /= usable.length;
  meanZ /= usable.length;
  let sxx = 0;
  let sxz = 0;
  let szz = 0;
  usable.forEach((point) => {
    const dx = point.x - meanX;
    const dz = point.z - meanZ;
    sxx += dx * dx;
    sxz += dx * dz;
    szz += dz * dz;
  });
  const trace = sxx + szz;
  const determinant = sxx * szz - sxz * sxz;
  const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * determinant));
  const major = (trace + discriminant) / 2;
  const minor = (trace - discriminant) / 2;
  if (!Number.isFinite(major) || major < 0.0001) return fallback;
  if (major / Math.max(minor, 0.0001) < 1.18) return fallback;
  return Math.atan2(2 * sxz, sxx - szz) / 2;
};
