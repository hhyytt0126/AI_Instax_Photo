import { createDriveFolder } from "./googleDriveUtils";

export default async function createNewFolder() {
  const folderId = await createDriveFolder("AI_Photo_" + Date.now());
  return folderId;
}