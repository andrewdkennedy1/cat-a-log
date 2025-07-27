// This file extends the global Window object with custom properties.
// It is automatically included by the TypeScript compiler.
declare global {
  interface Window {
    editEncounter: (encounterId: string) => void;
    deleteEncounter: (encounterId: string) => void;
  }
}