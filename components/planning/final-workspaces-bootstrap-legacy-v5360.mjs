import { installDashboardFinalWorkspaceEventsV1 } from "./dashboard-final-workspaces-events-v1.mjs?v=dashboard-final-workspaces-events-v1";
import { createFinalStageCalendarPageV5360 } from "./final-stage-calendar-page-v5360.mjs?v=final-stage-calendar-page-v5360";
import { createFinalOperationalRecordsPageV5360 } from "../records/final-operational-records-page-v5360.mjs?v=final-operational-records-page-v5360";
import {
  recordStageV5360,
  activityPeriodV5360,
  toneV5360,
} from "../shared/final-workspace-formatters-v5360.mjs?v=final-workspace-formatters-v5360";

/** Register the final workspace owner for execution after deferred extensions. */
export const installBelavistaFinalWorkspacesBootstrapV5360 = ({
  globalRef,
  ViewLayer,
  appStore,
  demoData,
  commissionDeals,
  esc,
  ico,
  apiFetch,
  operationalHeaders,
  notify,
  windowRef = globalRef.window,
  DateCtor = globalRef.Date,
} = {}) => {
  globalRef.installBelavistaFinalWorkspacesV5360 = () => {
    if (ViewLayer.prototype.__belavistaFinalWorkspacesV5360Installed) return;
    ViewLayer.prototype.__belavistaFinalWorkspacesV5360Installed = true;

    // Capture bind only after every deferred extension has loaded.
    const baseBind = ViewLayer.prototype.bind;
    const parseBrDateV5360 = (value) => {
      const text = String(value || "");
      const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) return Date.parse(`${match[3]}-${match[2]}-${match[1]}`) || 0;
      return Date.parse(text) || 0;
    };
    const latestDealForV5360 = (profileId) =>
      commissionDeals
        .filter((item) => item.profile === profileId)
        .slice()
        .sort((a, b) => parseBrDateV5360(b.date) - parseBrDateV5360(a.date))[0] ||
      null;
    ViewLayer.prototype.stages = createFinalStageCalendarPageV5360({
      demoData,
      esc,
      tone: toneV5360,
      activityPeriod: activityPeriodV5360,
    });

    ViewLayer.prototype.records = createFinalOperationalRecordsPageV5360({
      appStore,
      demoData,
      esc,
      ico,
      recordStage: recordStageV5360,
      tone: toneV5360,
    });

    installDashboardFinalWorkspaceEventsV1(ViewLayer, {
      appStore,
      demoData,
      latestDealForV5360,
      apiFetch,
      operationalHeaders,
      notify,
      baseBind,
      windowRef,
      DateCtor,
    });

    globalRef.__BELAVISTA_FINAL_WORKSPACES_V5360 = {
      version: "5.3.60",
      installedAt: new DateCtor().toISOString(),
      owner: "final-after-deferred",
    };

    try {
      appStore.set({ lastAction: "Workspaces finais v5.3.60 aplicados" });
    } catch {}
  };

  return globalRef.installBelavistaFinalWorkspacesV5360;
};
