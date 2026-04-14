/**
 * Hierarchy Manager Service
 * Manages hierarchy configurations and persistence
 */

import type {
  HierarchyDefinition,
  SavedHierarchy,
  HierarchyNode,
} from "../types.ts";

export class HierarchyManager {
  private api: any;
  private storageKey = "hierarchical_sidebar_v2_config";

  constructor(api: any) {
    this.api = api;
  }

  /**
   * Load saved hierarchies from localStorage
   */
  async loadHierarchies(): Promise<SavedHierarchy> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.log("No saved hierarchies found, using defaults", err);
    }

    return {
      hierarchies: [],
      activeHierarchy: undefined,
    };
  }

  /**
   * Save hierarchies to localStorage
   */
  async saveHierarchies(hierarchies: SavedHierarchy): Promise<boolean> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(hierarchies));
      return true;
    } catch (err) {
      console.error("Error saving hierarchies:", err);
      return false;
    }
  }

  /**
   * Create a new hierarchy
   */
  async createHierarchy(
    name: string,
    parentCollection: string,
    childCollections: string[],
    options?: Partial<HierarchyDefinition>,
  ): Promise<HierarchyDefinition> {
    const hierarchy: HierarchyDefinition = {
      id: `hierarchy_${Date.now()}`,
      name,
      parentCollection,
      childCollections,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...options,
    };

    const saved = await this.loadHierarchies();
    saved.hierarchies.push(hierarchy);

    // Set as active if it's the first one
    if (!saved.activeHierarchy) {
      saved.activeHierarchy = hierarchy.id;
    }

    await this.saveHierarchies(saved);
    return hierarchy;
  }

  /**
   * Update an existing hierarchy
   */
  async updateHierarchy(
    id: string,
    updates: Partial<HierarchyDefinition>,
  ): Promise<boolean> {
    const saved = await this.loadHierarchies();
    const index = saved.hierarchies.findIndex((h) => h.id === id);

    if (index === -1) return false;

    saved.hierarchies[index] = {
      ...saved.hierarchies[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return await this.saveHierarchies(saved);
  }

  /**
   * Delete a hierarchy
   */
  async deleteHierarchy(id: string): Promise<boolean> {
    const saved = await this.loadHierarchies();
    saved.hierarchies = saved.hierarchies.filter((h) => h.id !== id);

    // If deleted hierarchy was active, set another as active
    if (saved.activeHierarchy === id && saved.hierarchies.length > 0) {
      saved.activeHierarchy = saved.hierarchies[0].id;
    } else if (saved.hierarchies.length === 0) {
      saved.activeHierarchy = undefined;
    }

    return await this.saveHierarchies(saved);
  }

  /**
   * Set active hierarchy
   */
  async setActiveHierarchy(id: string): Promise<boolean> {
    const saved = await this.loadHierarchies();

    if (!saved.hierarchies.find((h) => h.id === id)) {
      return false;
    }

    saved.activeHierarchy = id;
    return await this.saveHierarchies(saved);
  }

  /**
   * Get active hierarchy
   */
  async getActiveHierarchy(): Promise<HierarchyDefinition | null> {
    const saved = await this.loadHierarchies();

    if (!saved.activeHierarchy) return null;

    return (
      saved.hierarchies.find((h) => h.id === saved.activeHierarchy) || null
    );
  }

  /**
   * Load hierarchy data with actual items
   */
  async loadHierarchyData(
    hierarchy: HierarchyDefinition,
  ): Promise<HierarchyNode[]> {
    const nodes: HierarchyNode[] = [];

    try {
      // Get parent items
      const parentResponse = await this.api.get(
        `/items/${hierarchy.parentCollection}`,
        {
          params: {
            fields: ["*"],
            limit: -1,
            sort: hierarchy.customOrder || ["name"],
          },
        },
      );

      const parents = parentResponse.data.data;

      // For each parent, build the tree
      for (const parent of parents) {
        const node: HierarchyNode = {
          id: parent.id,
          name: parent.name || parent.title || parent.id,
          collection: hierarchy.parentCollection,
          children: [],
          itemCount: 0,
          metadata: parent,
        };

        // Get children for each child collection
        for (const childCollection of hierarchy.childCollections) {
          const childNode = await this.loadChildNode(
            childCollection,
            hierarchy.parentCollection,
            parent.id,
          );

          if (childNode) {
            node.children.push(childNode);
            node.itemCount += childNode.itemCount;
          }
        }

        nodes.push(node);
      }
    } catch (error) {
      console.error("Error loading hierarchy data:", error);
    }

    return nodes;
  }

  /**
   * Load a child node with item count
   */
  private async loadChildNode(
    collection: string,
    parentCollection: string,
    parentId: string,
  ): Promise<HierarchyNode | null> {
    try {
      // Find the relation field
      const relations = await this.api.get("/relations");
      const relation = relations.data.data.find(
        (r: any) =>
          r.meta?.many_collection === collection &&
          r.meta?.one_collection === parentCollection,
      );

      if (!relation) {
        console.warn(
          `No relation found between ${collection} and ${parentCollection}`,
        );
        return null;
      }

      const relationField = relation.meta.many_field;

      // Get count
      const response = await this.api.get(`/items/${collection}`, {
        params: {
          filter: {
            [relationField]: { _eq: parentId },
          },
          aggregate: {
            count: "*",
          },
          limit: 0,
        },
      });

      const count = response.data.data?.[0]?.count?.id || 0;

      // Get collection metadata
      const colMeta = await this.api.get(`/collections/${collection}`);

      return {
        id: `${parentId}_${collection}`,
        name: colMeta.data.data.meta?.collection || collection,
        collection: collection,
        parentId: parentId,
        children: [],
        itemCount: count,
        icon: colMeta.data.data.meta?.icon,
        color: colMeta.data.data.meta?.color,
      };
    } catch (error) {
      console.error(`Error loading child node for ${collection}:`, error);
      return null;
    }
  }

  /**
   * Duplicate a hierarchy
   */
  async duplicateHierarchy(
    id: string,
    newName?: string,
  ): Promise<HierarchyDefinition | null> {
    const saved = await this.loadHierarchies();
    const original = saved.hierarchies.find((h) => h.id === id);

    if (!original) return null;

    const duplicate: HierarchyDefinition = {
      ...original,
      id: `hierarchy_${Date.now()}`,
      name: newName || `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saved.hierarchies.push(duplicate);
    await this.saveHierarchies(saved);

    return duplicate;
  }

  /**
   * Export hierarchy as JSON
   */
  exportHierarchy(hierarchy: HierarchyDefinition): string {
    return JSON.stringify(hierarchy, null, 2);
  }

  /**
   * Import hierarchy from JSON
   */
  async importHierarchy(
    jsonString: string,
  ): Promise<HierarchyDefinition | null> {
    try {
      const hierarchy = JSON.parse(jsonString) as HierarchyDefinition;

      // Assign new ID and timestamps
      hierarchy.id = `hierarchy_${Date.now()}`;
      hierarchy.createdAt = new Date().toISOString();
      hierarchy.updatedAt = new Date().toISOString();

      const saved = await this.loadHierarchies();
      saved.hierarchies.push(hierarchy);
      await this.saveHierarchies(saved);

      return hierarchy;
    } catch (err) {
      console.error("Error importing hierarchy:", err);
      return null;
    }
  }
}
