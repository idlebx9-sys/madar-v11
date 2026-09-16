/**
 * Stub: voiceTranscription was tied to the external Forge platform and is disabled.
 * Re-enable with your own provider if needed.
 */
export async function invokeLLM(..._args: unknown[]): Promise<never> {
  throw new Error("voiceTranscription is not configured in the independent MADAR build");
}
export default {};
