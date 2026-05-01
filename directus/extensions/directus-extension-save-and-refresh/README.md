# Run Flow + Refresh

Run a Directus manual flow for the current item and optionally refresh the current form, reload the page, or navigate back when the flow finishes.

This interface is designed for alias fields and works well in collection item views where a user needs a single action button to launch a manual flow and then refresh the UI.

## Interface

<img src="https://raw.githubusercontent.com/cesarechazu/directus-extension-run-flow-refresh/main/img/interface.png" alt="Run Flow + Refresh interface" width="720">

## Features

- Runs a manual Directus flow for the current item
- Passes the current collection and primary key to the flow trigger
- Optional confirmation dialog before execution
- Optional result dialog after completion
- Configurable refresh delay
- Supports form refresh, page reload, back navigation, or no reload after execution
- Works as an `alias` field, so it does not create a database column

## Usage

Use this interface on an `alias` field inside an item form when you want to expose a manual action button to the user.

Typical flow:

- The user opens an existing item.
- The user clicks the button to trigger a Directus manual flow for that record.
- The flow receives the current collection and primary key.
- When the flow finishes, the interface can refresh the current form, reload the page, go back, or do nothing.

## Options

- `flowId`: manual flow UUID to execute
- `buttonLabel`: visible button text
- `buttonIcon`: Directus icon for the action button
- `refreshType`: controls what happens after the flow finishes
  - `form`: refresh the current item form
  - `full`: reload the page
  - `back`: return to the previous page, with page reload fallback when there is no useful history entry
  - `none`: keep the current page unchanged
- `refreshDelay`: delay in milliseconds before applying the selected refresh behavior
- `confirmTitle`: confirmation dialog title
- `confirmMessage`: confirmation dialog message
- `confirmCancelLabel`: cancel button label
- `confirmContinueLabel`: continue button label
- `resultDialogEnabled`: show a result dialog after success
- `resultTitle`: result dialog title
- `resultMessage`: result dialog message
- `resultCloseLabel`: result dialog close button label

## Notes

- The selected flow must use the Directus `manual` trigger type.
- New items must be saved before the flow can run.
- If no flow completion event is detected, the interface falls back to a delayed completion handling path.
- `Reload Form` uses the same refresh pattern as the native Directus flow sidebar. If the form refresh context is not available, it falls back to a page reload.

## License

MIT
