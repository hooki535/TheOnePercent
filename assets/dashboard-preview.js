/* Isolated, read-only design preview. No account hydration or stored trade reads. */
Store.useDriver({
  name: "dashboard-empty-preview",
  list: () => [],
  get: () => ({}),
  put: () => { throw new Error("Read-only preview"); },
  patch: () => { throw new Error("Read-only preview"); },
  remove: () => false,
  clear: () => {},
});
