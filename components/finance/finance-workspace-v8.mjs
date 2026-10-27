import { createAtlasFinanceWorkspace, installAtlasFinancePage } from "../../dist/frontend/components.js";

/** Compatibility adapter; typed components own finance markup and route composition. */
export const createFinanceWorkspaceV8 = services => createAtlasFinanceWorkspace(services);

export const installFinancePageV8 = (ViewLayer, workspace = {}, appStore) =>
  installAtlasFinancePage({ ViewLayer, workspace, appStore });
