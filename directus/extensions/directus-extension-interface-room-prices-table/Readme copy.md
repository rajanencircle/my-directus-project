# Directus Room Prices Table Interface

A custom Directus interface for displaying and editing room prices in a grouped, tabular format with configurable rows and columns.

## Features

- **Grouped Display**: Group room prices by room category or price date
- **Configurable Layout**: Choose which field to use for rows and columns
- **Inline Editing**: Edit buy and sell prices directly in the table
- **Responsive Design**: Clean, responsive table layout with Directus styling
- **Real-time Updates**: Changes are saved automatically to the related collection

## Installation

### 1. Build the Extension

```bash
cd directus-extension-interface-room-prices-table
npm install
npm run build
```

### 2. Copy to Directus Extensions

Copy the entire extension folder to your Directus extensions directory:

```bash
# For Docker setup
cp -r directus-extension-interface-room-prices-table /path/to/your/directus/extensions/

# Or if using docker-compose, add a volume mount
# In your docker-compose.yml:
volumes:
  - ./extensions:/directus/extensions
```

### 3. Restart Directus

Restart your Directus instance to load the new extension:

```bash
docker-compose restart
```

## Configuration

### 1. Set up the Interface in Directus Admin

1. Go to **Settings** > **Data Model**
2. Select your `demo_hotel` collection
3. Find the `room_prices` field (your One-to-Many relationship field)
4. Click to edit the field
5. Under **Interface**, select **Room Prices Table**

### 2. Configure Options

The interface provides several configuration options:

- **Group By Field**: Choose how to group the data
  - Room Category (default)
  - Price Date
  - None (no grouping)

- **Row Field**: Choose which field to use for table rows
  - Price Date (default)
  - Room Category

- **Column Field**: Choose which field to use for table columns
  - Occupancy (default)
  - Room Category

- **Editable Fields**: Select which fields can be edited
  - Buy Price (default: enabled)
  - Sell Price (default: enabled)

## Usage

### Basic Workflow

1. **View Hotel**: Open any hotel record in your `demo_hotel` collection
2. **See Table**: The room prices will be displayed in a grouped table format
3. **Edit Prices**: Click on any buy_price or sell_price cell to edit
4. **Auto-Save**: Changes are automatically saved to the database

### Table Structure

With default settings, the table displays:

```
Room Category: Standard Room
                    One Person         Two People
                Buy     Sell      Buy     Sell
Jan-May 2026    65.00   55.00     -       -
Jun-Sep 2026    -       -         -       -
```

### Example Configuration for Your Data

Given your data structure, here's the recommended configuration:

1. **Group By**: Room Category (`room_category_id`)
2. **Row Field**: Price Date (`price_date_id`)
3. **Column Field**: Occupancy (`occupancy_id`)
4. **Editable Fields**: Both `buy_price` and `sell_price`

This will create a table grouped by room categories, with price dates as rows and occupancies as columns.

## Data Structure Requirements

The extension expects the following data structure:

### Required Collections

1. **demo_hotel** (parent collection)
2. **room_prices** (related collection with One-to-Many relationship)
3. **room_categories** (lookup collection)
4. **price_dates** (lookup collection)
5. **occupancies** (lookup collection)

### Required Fields in room_prices

- `hotel_id` - Link to demo_hotel
- `room_category_id` - Link to room_categories
- `price_date_id` - Link to price_dates
- `occupancy_id` - Link to occupancies
- `buy_price` - Decimal field
- `sell_price` - Decimal field

## Customization

### Changing API Endpoints

If your collection names differ, update the fetch calls in `interface.vue`:

```javascript
const [categoriesRes, datesRes, occupanciesRes] = await Promise.all([
  api.get("/items/your_categories_collection"),
  api.get("/items/your_dates_collection"),
  api.get("/items/your_occupancies_collection"),
]);
```

### Adding More Editable Fields

To add more editable fields, update the options in `index.ts`:

```javascript
options: {
  choices: [
    { text: 'Buy Price', value: 'buy_price' },
    { text: 'Sell Price', value: 'sell_price' },
    { text: 'Your Field', value: 'your_field' },
  ],
},
```

### Styling

The component uses Directus CSS variables for theming. To customize:

1. Edit the `<style>` section in `interface.vue`
2. Use Directus CSS variables (e.g., `var(--primary)`, `var(--background-page)`)

## Troubleshooting

### Extension Not Appearing

1. Check that the extension is in the correct directory
2. Verify the build completed successfully
3. Restart Directus completely
4. Check browser console for errors

### Data Not Loading

1. Verify the One-to-Many relationship is configured correctly
2. Check that collection names match in the code
3. Ensure the hotel record has a valid primary key
4. Check browser console and Directus logs for API errors

### Edits Not Saving

1. Verify you have edit permissions on the room_prices collection
2. Check that the field names match exactly
3. Ensure the input type (number) matches the field type (decimal/float)

## Development

### Watch Mode

For development with auto-reload:

```bash
npm run dev
```

### Linking

To link the extension during development:

```bash
npm run link
```

## License

MIT

## Support

For issues or questions:

1. Check the Directus extension documentation
2. Review the source code comments
3. Check Directus community forums
