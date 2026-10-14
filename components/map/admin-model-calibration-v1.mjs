export const assertAdminModelCalibrationDependenciesV1 = (MapScene, dependencies) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Admin model calibration requires the existing MapScene constructor.");
  if (typeof dependencies?.getCalibration !== "function")
    throw new TypeError("Admin model calibration requires getCalibration().");
  return dependencies;
};

export const installAdminModelCalibrationV1 = (MapScene, dependencies) => {
  assertAdminModelCalibrationDependenciesV1(MapScene, dependencies);
  const { getCalibration } = dependencies;
  const AdminModelCalibrationMethodsV1 = class {
    applyAdminModelCalibrationV1(THREE, model, sourceMatrix) {
      if (!THREE || !model || !sourceMatrix) return sourceMatrix;
      const calibration = getCalibration();
      const rotation = calibration.rotation || {},
        shift = calibration.shift || {};
      const hasRotation = Object.values(rotation).some(
        (value) => Math.abs(Number(value) || 0) > 0.0001,
      );
      const hasShift = Object.values(shift).some(
        (value) => Math.abs(Number(value) || 0) > 0.0001,
      );
      const hasScale = Math.abs((Number(calibration.scale) || 1) - 1) > 0.0001;
      if (!hasRotation && !hasShift && !hasScale) {
        this.dataset.adminModelCalibration =
          "baseline · parâmetros 0/0/0 · escala 1";
        this.dataset.adminModelCalibrationUrl =
          "modelRotate,modelRotateX/Y/Z,modelShiftX/Y/Z,modelScale";
        return sourceMatrix;
      }

      // Aplica a calibração após o ajuste afim ao frame da foto, ao redor do
      // centro do footprint, sem alterar o posicionamento do fundo.
      model.updateMatrixWorld(true);
      this.sceneStage?.updateMatrixWorld?.(true);
      const stageInverse = this.sceneStage
        ? new THREE.Matrix4().copy(this.sceneStage.matrixWorld).invert()
        : new THREE.Matrix4();
      const worldBounds = new THREE.Box3().setFromObject(model);
      const worldCenter = worldBounds.getCenter(new THREE.Vector3());
      const localCenter = worldCenter.clone().applyMatrix4(stageInverse);
      const euler = new THREE.Euler(
        (Number(rotation.x || 0) * Math.PI) / 180,
        (Number(rotation.y || 0) * Math.PI) / 180,
        (Number(rotation.z || 0) * Math.PI) / 180,
        "XYZ",
      );
      const aroundCenter = new THREE.Matrix4()
        .makeTranslation(localCenter.x, localCenter.y, localCenter.z)
        .multiply(new THREE.Matrix4().makeRotationFromEuler(euler))
        .multiply(
          new THREE.Matrix4().makeTranslation(
            -localCenter.x,
            -localCenter.y,
            -localCenter.z,
          ),
        );
      const extraScale = new THREE.Matrix4().makeScale(
        Number(calibration.scale) || 1,
        Number(calibration.scale) || 1,
        Number(calibration.scale) || 1,
      );
      const extraShift = new THREE.Matrix4().makeTranslation(
        Number(shift.x) || 0,
        Number(shift.y) || 0,
        Number(shift.z) || 0,
      );
      const calibrated = extraShift
        .multiply(aroundCenter)
        .multiply(extraScale)
        .multiply(sourceMatrix);
      this.dataset.adminModelCalibration = `rotate ${Number(rotation.x || 0).toFixed(2)}°/${Number(rotation.y || 0).toFixed(2)}°/${Number(rotation.z || 0).toFixed(2)}° · shift ${Number(shift.x || 0).toFixed(2)}/${Number(shift.y || 0).toFixed(2)}/${Number(shift.z || 0).toFixed(2)} · scale ${(Number(calibration.scale) || 1).toFixed(3)}`;
      this.dataset.adminModelCalibrationUrl =
        "modelRotate,modelRotateX/Y/Z,modelShiftX/Y/Z,modelScale";
      this.dataset.adminModelCalibrationFrame =
        "model only · background unchanged · pivot at fitted footprint center";
      return calibrated;
    }
  };
  Object.defineProperty(
    MapScene.prototype,
    "applyAdminModelCalibrationV1",
    Object.getOwnPropertyDescriptor(
      AdminModelCalibrationMethodsV1.prototype,
      "applyAdminModelCalibrationV1",
    ),
  );
  return MapScene;
};
