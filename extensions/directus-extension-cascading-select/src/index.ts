import InterfaceComponent from './interface.vue';

export default {
  id: 'cascading-select',
  name: 'Cascading Select',
  description: 'Cascading dropdown with autocomplete and dependent filtering',
  icon: 'arrow_drop_down_circle',
  component: InterfaceComponent,
  options: ({ relations }) => {
    return [
      {
        field: 'levels',
        name: 'Cascade Levels',
        type: 'json',
        meta: {
          interface: 'input-code',
          options: {
            language: 'json',
            placeholder: JSON.stringify([
              {
                "collection": "continents",
                "valueField": "id",
                "textField": "name",
                "parentField": null,
                "filter": {
                  "status": {
                    "_eq": "active"
                  }
                }
              },
              {
                "collection": "countries",
                "valueField": "id",
                "textField": "name",
                "parentField": "continent_id",
                "filter": {
                  "is_visible": {
                    "_eq": true
                  }
                }
              },
              {
                "collection": "states",
                "valueField": "id",
                "textField": "name",
                "parentField": "country_id",
                "filter": null
              }
            ], null, 2)
          },
          note: 'Define the hierarchy of collections. Each level can have its own filter using Directus filter syntax in the "filter" property.'
        },
        schema: {
          default_value: [
            {
              collection: 'continents',
              valueField: 'id',
              textField: 'name',
              parentField: null,
              filter: null
            },
            {
              collection: 'countries',
              valueField: 'id',
              textField: 'name',
              parentField: 'continent_id',
              filter: null
            },
            {
              collection: 'states',
              valueField: 'id',
              textField: 'name',
              parentField: 'country_id',
              filter: null
            }
          ]
        }
      },
      {
        field: 'placeholder',
        name: 'Placeholder',
        type: 'string',
        meta: {
          interface: 'input',
          width: 'half',
          note: 'Placeholder text for search input'
        },
        schema: {
          default_value: 'Search or select...'
        }
      },
      {
        field: 'allowCreate',
        name: 'Allow Create New Items',
        type: 'boolean',
        meta: {
          interface: 'boolean',
          width: 'half',
          note: 'Show "+" button to create new items inline'
        },
        schema: {
          default_value: true
        }
      },
      {
        field: 'globalFilter',
        name: 'Global Filter (Optional)',
        type: 'json',
        meta: {
          interface: 'input-code',
          options: {
            language: 'json',
            placeholder: JSON.stringify({
              "status": {
                "_eq": "published"
              }
            }, null, 2)
          },
          note: 'Optional: Add a global filter applied to ALL levels (in addition to individual level filters)'
        }
      }
    ];
  },
  types: ['json'],
};