/** Builds the delegated event routes owned by the sidebar navigation surface. */
export const createSidebarNavigationEventRoutesV1 = ({
  closeMobileNavigation = () => {},
  openMessages = () => {},
  navigate = () => {},
} = {}) => Object.freeze([
  {
    eventType: "click",
    selector: '[data-sidebar-action="messages"]',
    action: "open-messages",
    handler: () => {
      closeMobileNavigation();
      openMessages();
    },
  },
  {
    eventType: "click",
    selector: "[data-view]",
    action: "navigate",
    handler: ({ target }) => {
      closeMobileNavigation();
      navigate(target);
    },
  },
]);
