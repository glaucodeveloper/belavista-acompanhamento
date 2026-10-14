import test from "node:test";
import assert from "node:assert/strict";
import { createStageMaterialProfileHelpersV1 } from "../../components/planning/stage-material-profiles.mjs";

test("stage material and profile helpers preserve normalized fields and defaults", () => {
  const helpers = createStageMaterialProfileHelpersV1({
    demoData: {
      stageMaterials: {
        Terraplanagem: [
          { id: "soil", name: " Solo ", scope: "compactação", quantity: 2 },
        ],
      },
    },
  });

  assert.deepEqual(helpers.splitStageConfigList("projeto\n execução, vistoria"), [
    "projeto",
    "execução",
    "vistoria",
  ]);
  assert.deepEqual(
    helpers.normalizeStageMaterialRows([{ scope: "serviço", quantity: 3 }]),
    [
      {
        id: "material-1",
        name: "",
        description: "serviço",
        quantity: "3",
        unit: "un",
        status: "Planejado",
      },
    ],
  );
  assert.equal(helpers.defaultStageMaterialRows({ name: "Terraplanagem" })[0].id, "soil");
  assert.equal(
    helpers.defaultStageMaterialRows({ name: "Nova", materials: ["Brita"] })[0].name,
    "Brita",
  );
  assert.deepEqual(
    helpers.stageProfilesFromSettings({
      stageProfiles: {
        earthwork: {
          requirements: "projeto\n licença",
          materialsTable: [{ name: "Solo" }],
          notificationTargets: { foreman: "warley, ana" },
        },
      },
    }),
    {
      earthwork: {
        requirements: ["projeto", "licença"],
        conditions: [],
        typicalDescription: "",
        organizationRequest: "",
        organizationContext: "",
        requestHints: [],
        evidenceFocus: [],
        procurementFocus: [],
        materialsTable: [
          {
            id: "material-1",
            name: "Solo",
            description: "",
            quantity: "",
            unit: "un",
            status: "Planejado",
          },
        ],
        notificationTargets: { foreman: ["warley", "ana"] },
      },
    },
  );
});
