# Directus Cascading Select Interface

A custom Directus interface extension that provides cascading dropdowns with autocomplete and the ability to create new items inline. Perfect for hierarchical data like continents → countries → states.

## Features

- ✨ **Cascading Dropdowns**: Automatically filters child dropdowns based on parent selection
- 🔍 **Autocomplete**: Built-in search functionality in dropdowns
- ➕ **Inline Creation**: Create new items directly from the interface
- 🔒 **Smart Disabling**: Child dropdowns are disabled until parent is selected
- 🔄 **Automatic Reset**: Changing a parent selection clears all child selections
- 💾 **Caching**: Intelligent caching to minimize API calls

## Installation

### 1. Build the Extension

```bash
npm install
npm run build
```

### 2. Install in Directus

Copy the entire extension folder to your Directus extensions directory:

```bash
cp -r directus-cascading-select /path/to/directus/extensions/
```

Or create a symlink:

```bash
cd /path/to/directus/extensions/
ln -s /path/to/directus-cascading-select ./directus-cascading-select
```

### 3. Restart Directus

```bash
# Restart your Directus instance
npx directus bootstrap
```

## Setup

### 1. Create Your Collections

First, create your collections in Directus with the appropriate relationships:

**Continents Collection:**

- `id` (Primary Key)
- `name` (String)

**Countries Collection:**

- `id` (Primary Key)
- `name` (String)
- `continent_id` (Many-to-One relationship to Continents)

**States Collection:**

- `id` (Primary Key)
- `name` (String)
- `country_id` (Many-to-One relationship to Countries)

### 2. Add Field to Your Collection

In the collection where you want to use the cascading select:

1. Create a new field with type **JSON**
2. In the **Interface** dropdown, select **Cascading Select**
3. Configure the interface options

### 3. Configure the Interface

In the interface options, configure the cascade levels:

```json
[
  {
    "collection": "continents",
    "valueField": "id",
    "textField": "name",
    "parentField": null
  },
  {
    "collection": "countries",
    "valueField": "id",
    "textField": "name",
    "parentField": "continent_id"
  },
  {
    "collection": "states",
    "valueField": "id",
    "textField": "name",
    "parentField": "country_id"
  }
]
```

**Configuration Options:**

- `collection`: The name of the Directus collection
- `valueField`: The field to use as the value (usually `id`)
- `textField`: The field to display in the dropdown (usually `name`)
- `parentField`: The field that references the parent collection (null for top level)

### 4. Additional Options

- **Placeholder**: Custom placeholder text for dropdowns
- **Allow Create New Items**: Enable/disable the "+" button to create new items (default: true)

## How It Works

### Cascading Behavior

1. **First Level (Continents)**:
   - Always enabled
   - Shows all available continents
2. **Second Level (Countries)**:
   - Disabled until a continent is selected
   - Only shows countries that belong to the selected continent
   - Automatically cleared if continent selection changes
3. **Third Level (States)**:
   - Disabled until a country is selected
   - Only shows states that belong to the selected country
   - Automatically cleared if country or continent selection changes

### Data Storage

The selected values are stored as a JSON object:

```json
{
  "continents": 1,
  "countries": 5,
  "states": 42
}
```

### Creating New Items

Click the "+" icon next to any dropdown to create a new item:

- Parent relationships are automatically set
- The new item is immediately selected
- The dropdown list is refreshed

## Example Use Cases

- **Geographic Hierarchies**: Continent → Country → State → City
- **Organizational Structure**: Department → Team → Employee
- **Product Categories**: Category → Subcategory → Product
- **Administrative Divisions**: Region → District → Municipality

## Customization

### Adding More Levels

You can add as many levels as needed. Just extend the configuration array:

```json
[
  {
    "collection": "continents",
    "valueField": "id",
    "textField": "name",
    "parentField": null
  },
  {
    "collection": "countries",
    "valueField": "id",
    "textField": "name",
    "parentField": "continent_id"
  },
  {
    "collection": "states",
    "valueField": "id",
    "textField": "name",
    "parentField": "country_id"
  },
  {
    "collection": "cities",
    "valueField": "id",
    "textField": "name",
    "parentField": "state_id"
  }
]
```

### Custom Field Names

If your collections use different field names:

```json
[
  {
    "collection": "regions",
    "valueField": "region_id",
    "textField": "region_name",
    "parentField": null
  },
  {
    "collection": "locations",
    "valueField": "location_id",
    "textField": "location_title",
    "parentField": "parent_region"
  }
]
```

## Development

### Building for Development

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

### Project Structure

```
directus-cascading-select/
├── src/
│   ├── index.ts          # Extension registration
│   └── interface.vue     # Main Vue component
├── package.json
├── tsconfig.json
└── README.md
```

## API Permissions

Ensure your Directus role has the following permissions:

- **Read** access to all collections used in the cascade
- **Create** access to collections if "Allow Create New Items" is enabled

## Troubleshooting

### Dropdowns are empty

- Check that the collection names are correct
- Verify that the field names (valueField, textField, parentField) match your schema
- Ensure proper read permissions

### Create button not working

- Verify create permissions on the collection
- Check browser console for errors
- Ensure the textField is properly configured

### Child dropdowns not filtering

- Verify the parentField is correctly set
- Check that the relationship exists in your schema
- Ensure parent collection has data

## License

MIT

## Credits

Created for Directus 10+
