/**
 * Relationship Detection Service
 * Automatically discovers and analyzes collection relationships
 */

import type {
  DirectusCollection,
  DirectusRelation,
  DetectedRelationship,
  RelationshipMap,
  CollectionMetadata,
} from "../types";

export class RelationshipService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  /**
   * Get all collections excluding system collections (optional)
   */
  async getAllCollections(
    includeSystem = false,
  ): Promise<DirectusCollection[]> {
    try {
      const response = await this.api.get("/collections");
      const collections = response.data.data;

      if (!includeSystem) {
        return collections.filter(
          (col: DirectusCollection) =>
            !col.collection.startsWith("directus_") && !col.meta?.hidden,
        );
      }

      return collections;
    } catch (error) {
      console.error("Error fetching collections:", error);
      return [];
    }
  }

  /**
   * Get all relations in the system
   */
  async getAllRelations(): Promise<DirectusRelation[]> {
    try {
      const response = await this.api.get("/relations");
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching relations:", error);
      return [];
    }
  }

  /**
   * Detect all parent-child relationships
   */
  async detectRelationships(): Promise<DetectedRelationship[]> {
    const collections = await this.getAllCollections(false);
    const relations = await this.getAllRelations();
    const detected: DetectedRelationship[] = [];

    for (const relation of relations) {
      // Skip system collections
      if (
        relation.collection?.startsWith("directus_") ||
        relation.related_collection?.startsWith("directus_")
      ) {
        continue;
      }

      // M2O relationships (Many-to-One)
      if (relation.meta?.many_collection && relation.meta?.one_collection) {
        const parentCol = collections.find(
          (c) => c.collection === relation.meta?.one_collection,
        );
        const childCol = collections.find(
          (c) => c.collection === relation.meta?.many_collection,
        );

        if (parentCol && childCol) {
          detected.push({
            parentCollection: relation.meta.one_collection,
            parentCollectionName:
              parentCol.meta?.collection || relation.meta.one_collection,
            childCollection: relation.meta.many_collection,
            childCollectionName:
              childCol.meta?.collection || relation.meta.many_collection,
            relationField: relation.meta.many_field,
            relationType: "m2o",
            icon: childCol.meta?.icon,
          });
        }
      }
    }

    return detected;
  }

  /**
   * Build a relationship map for quick lookups
   */
  async buildRelationshipMap(): Promise<RelationshipMap> {
    const relationships = await this.detectRelationships();
    const map: RelationshipMap = {};

    for (const rel of relationships) {
      // Initialize parent collection entry
      if (!map[rel.parentCollection]) {
        map[rel.parentCollection] = { parents: [], children: [] };
      }

      // Initialize child collection entry
      if (!map[rel.childCollection]) {
        map[rel.childCollection] = { parents: [], children: [] };
      }

      // Add to parent's children
      map[rel.parentCollection].children.push(rel);

      // Add to child's parents
      map[rel.childCollection].parents.push(rel);
    }

    return map;
  }

  /**
   * Get child collections for a specific parent
   */
  async getChildCollections(
    parentCollection: string,
  ): Promise<DetectedRelationship[]> {
    const map = await this.buildRelationshipMap();
    return map[parentCollection]?.children || [];
  }

  /**
   * Get parent collections for a specific child
   */
  async getParentCollections(
    childCollection: string,
  ): Promise<DetectedRelationship[]> {
    const map = await this.buildRelationshipMap();
    return map[childCollection]?.parents || [];
  }

  /**
   * Get collection metadata with item counts
   */
  async getCollectionMetadata(
    collection: string,
  ): Promise<CollectionMetadata | null> {
    try {
      // Get collection info
      const colResponse = await this.api.get(`/collections/${collection}`);
      const colData = colResponse.data.data;

      // Get item count
      let itemCount = 0;
      try {
        const itemsResponse = await this.api.get(`/items/${collection}`, {
          params: {
            aggregate: { count: "*" },
            limit: 0,
          },
        });
        itemCount = itemsResponse.data.data?.[0]?.count?.id || 0;
      } catch (err) {
        console.warn(`Could not get count for ${collection}`);
      }

      // Check if has relations
      const relations = await this.getAllRelations();
      const hasRelations = relations.some(
        (r) =>
          r.collection === collection || r.related_collection === collection,
      );

      return {
        collection: collection,
        name: colData.meta?.collection || collection,
        icon: colData.meta?.icon || "folder",
        color: colData.meta?.color,
        itemCount: itemCount,
        isSystem: collection.startsWith("directus_"),
        hasRelations: hasRelations,
      };
    } catch (error) {
      console.error(`Error fetching metadata for ${collection}:`, error);
      return null;
    }
  }

  /**
   * Get all collections with their metadata
   */
  async getAllCollectionMetadata(
    includeSystem = false,
  ): Promise<CollectionMetadata[]> {
    const collections = await this.getAllCollections(includeSystem);
    const metadata: CollectionMetadata[] = [];

    for (const collection of collections) {
      const meta = await this.getCollectionMetadata(collection.collection);
      if (meta) {
        metadata.push(meta);
      }
    }

    return metadata;
  }

  /**
   * Find potential hierarchies automatically
   */
  async suggestHierarchies(): Promise<
    { parent: string; children: string[]; strength: number }[]
  > {
    const map = await this.buildRelationshipMap();
    const suggestions: {
      parent: string;
      children: string[];
      strength: number;
    }[] = [];

    for (const [parent, relations] of Object.entries(map)) {
      if (relations.children.length >= 2) {
        // This parent has multiple children - good hierarchy candidate
        const children = relations.children.map((r) => r.childCollection);
        const strength = relations.children.length;

        suggestions.push({
          parent,
          children,
          strength,
        });
      }
    }

    // Sort by strength (number of children)
    return suggestions.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Validate if a hierarchy configuration is valid
   */
  async validateHierarchy(
    parent: string,
    children: string[],
  ): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const map = await this.buildRelationshipMap();

    // Check if parent exists
    if (!map[parent]) {
      errors.push(
        `Parent collection "${parent}" not found or has no relationships`,
      );
    }

    // Check if children are actually related to parent
    const validChildren =
      map[parent]?.children.map((r) => r.childCollection) || [];
    for (const child of children) {
      if (!validChildren.includes(child)) {
        errors.push(`Collection "${child}" is not a child of "${parent}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
