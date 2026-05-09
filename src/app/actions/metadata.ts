'use server';

import { prisma } from '@/lib/core/prisma';
import { protectedAction, revalidateDashboard } from '@/lib/core/action-utils';

/**
 * Helper to ensure model exists or log diagnostics
 */
function getModel() {
  if (!(prisma as any).metadataTemplate) {
    console.error("CRITICAL: metadataTemplate model missing from Prisma client!");
    console.error("Available models:", Object.keys(prisma).filter(k => !k.startsWith('_') && typeof (prisma as any)[k] === 'object'));
    throw new Error("Metadata Template feature is currently unavailable due to a database client mismatch.");
  }
  return (prisma as any).metadataTemplate;
}

/**
 * Fetches all metadata templates for the current user.
 */
export async function getMetadataTemplates() {
  return await protectedAction(async (userId) => {
    const model = getModel();
    return await model.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
  });
}

/**
 * Creates a new metadata template.
 */
export async function createMetadataTemplate(data: { name: string, content: string }) {
  return await protectedAction(async (userId) => {
    const model = getModel();
    const template = await model.create({
      data: {
        userId,
        name: data.name,
        content: data.content
      }
    });
    
    await revalidateDashboard();
    return template;
  });
}

/**
 * Deletes a metadata template.
 */
export async function deleteMetadataTemplate(id: string) {
  return await protectedAction(async (userId) => {
    const model = getModel();
    // Ensure the template belongs to the user
    const template = await model.findUnique({
      where: { id }
    });

    if (!template || template.userId !== userId) {
      throw new Error("Template not found or unauthorized.");
    }

    await model.delete({
      where: { id }
    });

    await revalidateDashboard();
    return { success: true };
  });
}

/**
 * Updates an existing metadata template.
 */
export async function updateMetadataTemplate(id: string, data: { name: string, content: string }) {
  return await protectedAction(async (userId) => {
    const model = getModel();
    // Ensure the template belongs to the user
    const template = await model.findUnique({
      where: { id }
    });

    if (!template || template.userId !== userId) {
      throw new Error("Template not found or unauthorized.");
    }

    const updated = await model.update({
      where: { id },
      data: {
        name: data.name,
        content: data.content
      }
    });

    await revalidateDashboard();
    return updated;
  });
}
