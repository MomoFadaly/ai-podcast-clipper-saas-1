// Stub for saved layouts actions
export async function getSavedLayouts() {
  return { layouts: [] };
}

export async function saveLayout(data: any) {
  return { success: true };
}

export async function createTemporaryLayout(data: any) {
  return { layout: null };
}