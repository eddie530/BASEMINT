// Independent branch policy: runtime stays locked until isolation is implemented.
// Do not add an environment-variable bypass: a preview must not inherit live credentials.
export function independentPreviewRuntimeAllowed(): boolean {
  return false;
}
export function independentPreviewTransactionAllowed(): boolean {
  return false;
}
