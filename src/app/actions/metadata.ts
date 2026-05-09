'use server';

import { prisma } from '@/lib/core/prisma';
import { protectedAction, revalidateDashboard } from '@/lib/core/action-utils';

/**
 * Fetches all metadata templates for the current user.
 */
export async function getMetadataTemplates() {
  return await protectedAction(async (userId) => {
    return await prisma.metadataTemplate.findMany({
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
    const template = await prisma.metadataTemplate.create({
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
    // Ensure the template belongs to the user
    const template = await prisma.metadataTemplate.findUnique({
      where: { id }
    });

    if (!template || template.userId !== userId) {
      throw new Error("Template not found or unauthorized.");
    }

    await prisma.metadataTemplate.delete({
      where: { id }
    });

    await revalidateDashboard();
    return { success: true };
  });
}
