/**
 * Type definitions for Hierarchical Sidebar Extension
 */

// ============================================================================
// Directus API Types
// ============================================================================

export interface DirectusCollection {
  /** Collection name */
  collection: string;

  /** Collection metadata */
  meta?: {
    /** Display name */
    collection?: string;

    /** Icon name */
    icon?: string;

    /** Color */
    color?: string;

    /** Note/description */
    note?: string;

    /** Whether collection is hidden */
    hidden?: boolean;

    /** Singular name */
    singular?: string;

    /** Additional metadata */
    [key: string]: any;
  };

  /** Schema information */
  schema?: any;
}

export interface DirectusRelation {
  /** Collection name */
  collection?: string;

  /** Field name */
  field?: string;

  /** Related collection */
  related_collection?: string;

  /** Relation metadata */
  meta?: {
    /** Many collection (child) */
    many_collection?: string;

    /** Many field */
    many_field?: string;

    /** One collection (parent) */
    one_collection?: string;

    /** One field */
    one_field?: string;

    /** Junction field */
    junction_field?: string;

    /** Additional metadata */
    [key: string]: any;
  };

  /** Schema information */
  schema?: any;
}

// ============================================================================
// Hierarchy Configuration Types
// ============================================================================

export interface HierarchyDefinition {
  /** Unique identifier */
  id: string;

  /** Display name of the hierarchy */
  name: string;

  /** Optional description */
  description?: string;

  /** Parent collection that acts as folders */
  parentCollection: string;

  /** Array of child collection names */
  childCollections: string[];

  /** Icon for the hierarchy */
  icon?: string;

  /** Whether this hierarchy is enabled */
  enabled: boolean;

  /** Custom sort order for parent items */
  customOrder?: string[];

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Additional metadata */
  [key: string]: any;
}

export interface SavedHierarchy {
  /** List of all saved hierarchies */
  hierarchies: HierarchyDefinition[];

  /** ID of the currently active hierarchy */
  activeHierarchy?: string;
}

export interface HierarchyNode {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Collection name */
  collection: string;

  /** Parent ID (for child nodes) */
  parentId?: string;

  /** Child nodes */
  children: HierarchyNode[];

  /** Total item count */
  itemCount: number;

  /** Icon name */
  icon?: string;

  /** Color */
  color?: string;

  /** Original metadata from Directus */
  metadata?: any;
}

// ============================================================================
// Relationship Detection Types
// ============================================================================

export interface DetectedRelationship {
  /** Parent collection name */
  parentCollection: string;

  /** Parent collection display name */
  parentCollectionName: string;

  /** Child collection name */
  childCollection: string;

  /** Child collection display name */
  childCollectionName: string;

  /** Field name in child that references parent */
  relationField: string;

  /** Type of relationship */
  relationType: 'm2o' | 'o2m' | 'm2m';

  /** Icon for child collection */
  icon?: string;
}

export interface RelationshipMap {
  [collectionName: string]: {
    /** Collections that this collection is a parent of */
    children: DetectedRelationship[];

    /** Collections that this collection is a child of */
    parents: DetectedRelationship[];
  };
}

export interface CollectionMetadata {
  /** Collection name */
  collection: string;

  /** Display name */
  name: string;

  /** Icon name */
  icon: string;

  /** Color */
  color?: string;

  /** Number of items in collection */
  itemCount: number;

  /** Whether this is a system collection */
  isSystem: boolean;

  /** Whether this collection has any relations */
  hasRelations: boolean;
}

// ============================================================================
// Legacy Types (kept for backward compatibility)
// ============================================================================

export interface ChildCollectionConfig {
  /** The name of the child collection (e.g., 'hotels') */
  collection: string;

  /** The field name that references the parent collection (e.g., 'continent_id') */
  relationField: string;
}

export interface HierarchyConfig {
  /** The parent collection that acts as folders (e.g., 'continents') */
  parentCollection: string;

  /** Array of child collections to display under each parent */
  childCollections: ChildCollectionConfig[];
}

export interface ParentItem {
  /** Unique identifier of the parent item */
  id: string;

  /** Display name of the parent item */
  name: string;

  /** Additional metadata */
  [key: string]: any;
}

export interface ChildCollection {
  /** Collection name */
  collection: string;

  /** Display name */
  name: string;

  /** Icon name from Material Icons */
  icon?: string;

  /** Number of items in this collection for this parent */
  count?: number;

  /** Field name that references parent */
  relationField: string;
}

export interface ParentData {
  /** Parent item ID */
  id: string;

  /** Parent item name */
  name: string;

  /** Child collections under this parent */
  children: ChildCollection[];
}

export interface CollectionMeta {
  /** Collection name */
  collection: string;

  /** Display metadata */
  meta?: {
    /** Display name */
    name?: string;

    /** Icon name */
    icon?: string;

    /** Singular name */
    singular?: string;

    /** Note/description */
    note?: string;
  };
}

export interface DirectusFilter {
  /** Field name to filter on */
  [fieldName: string]: {
    /** Equals operator */
    _eq?: string | number;

    /** Not equals operator */
    _neq?: string | number;

    /** In operator */
    _in?: Array<string | number>;

    /** Not in operator */
    _nin?: Array<string | number>;

    /** Greater than */
    _gt?: string | number;

    /** Greater than or equal */
    _gte?: string | number;

    /** Less than */
    _lt?: string | number;

    /** Less than or equal */
    _lte?: string | number;
  };
}

export interface DirectusQueryParams {
  /** Fields to return */
  fields?: string[];

  /** Filter items */
  filter?: DirectusFilter;

  /** Sort results */
  sort?: string[];

  /** Limit number of results */
  limit?: number;

  /** Offset results */
  offset?: number;

  /** Aggregate functions */
  aggregate?: {
    count?: string | string[];
    sum?: string | string[];
    avg?: string | string[];
    min?: string | string[];
    max?: string | string[];
  };

  /** Search query */
  search?: string;
}

export interface NavigationEvent {
  /** Selected collection name */
  collection: string;

  /** Parent item information */
  parent?: {
    /** Parent item ID */
    id: string;

    /** Parent item name */
    name: string;
  };
}

export type ExpandedParentsSet = Set<string>;

export interface ComponentState {
  /** Currently loading data */
  loading: boolean;

  /** Error message if any */
  error: string | null;

  /** Hierarchical data structure */
  hierarchicalData: ParentData[];

  /** Set of expanded parent IDs */
  expandedParents: ExpandedParentsSet;

  /** Show configuration dialog */
  showConfig: boolean;

  /** Currently selected item */
  selectedItem: {
    collection: string;
    parentId: string;
  } | null;

  /** Current configuration */
  config: HierarchyConfig;
}
