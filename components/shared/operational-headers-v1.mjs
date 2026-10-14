/** Creates the current actor's request headers for operational API calls. */
export const createOperationalHeadersV1 = (dependencies = {}) => {
  const { appStore } = dependencies;

  return (extra = {}) => {
    const actor = appStore.get().currentActor || {
      role: "owner",
      uid: "local-warley",
      name: "Warley",
    };
    return {
      "X-Belavista-Role": actor.role,
      "X-Belavista-User": actor.uid,
      "X-Belavista-Name": actor.name,
      ...extra,
    };
  };
};
