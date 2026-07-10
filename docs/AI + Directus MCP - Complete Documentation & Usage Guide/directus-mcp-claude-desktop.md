# Connecting Directus to Claude Desktop via MCP

Welcome! This guide walks you through connecting your Directus CMS to Claude Desktop using the **Model Context Protocol (MCP)**. Once connected, you can ask Claude questions about your content, browse and manage Directus items, and work smarter all from your desktop.

> **What is MCP?**
> MCP (Model Context Protocol) is a standard that lets Claude talk directly to external tools and services, like your Directus CMS. Think of it as a secure bridge between Claude and your content.

---

## Prerequisites

Before you begin, make sure you have the following:

- **Directus v11.12 or newer** : your instances already meet this requirement
- **Administrator access** to the Directus environment you want to connect
- **Claude Desktop** installed on your computer, [download it here](https://claude.ai/download)
- A Claude account on any plan:
  - **Free** : supported (limited to 1 connector)
  - **Pro / Max** : supported (multiple connectors)
  - **Team / Enterprise** : supported (connectors managed by your org owner)

---

## Step 1 : Enable MCP in Directus

This step needs to be done **once per environment** by a Directus administrator.

1. Log in to your Directus instance (see the environment URLs below).
2. Go to **Settings** (gear icon in the left sidebar).
3. Find the **MCP** section.
4. Toggle **Enable MCP Server** to **ON**.
5. Save your settings.

**Environment login URLs:**

| Environment | Admin Login URL                                |
| ----------- | ---------------------------------------------- |
| Production  | https://content.botg.cloud/admin/login         |
| Staging     | https://staging.content.botg.cloud/admin/login |
| Dev         | https://dev.content.botg.cloud/admin/login     |

> **Tip:** Repeat this step for each environment you want to connect (e.g. enable it on Staging and Dev separately).

---

## Step 2 : Get Your Access Token

There are two ways to authenticate. **We recommend the Static Access Token** , it's simpler and works right away.

---

### Recommended: Static Access Token

A static access token is a secure key tied to your Directus user. It lets Claude connect on your behalf.

**How to generate one:**

1. In Directus, go to **Settings → Users**.
2. Click on your user account.
3. Scroll down to the **Token** field.
4. Click **Generate Token**.
5. **Copy the token immediately**, it will only be shown once.
6. Store it somewhere safe (e.g. a password manager).

> **Important:** Generate a **separate token for each environment** (Production, Staging, Dev). This way, if one token needs to be revoked, the others remain unaffected.

**Example token** (yours will look similar):

```
2ecR7PLJIpOZZOMUUaOERZWkKv....
```

---

### Alternative: OAuth (Advanced)

OAuth provides a more secure, browser-based login flow, ideal for teams where multiple people share a connector. Instead of pasting a token, you complete a login in your browser when prompted.

To use OAuth, your Directus administrator needs to set the following environment variables on the server:

```
MCP_OAUTH_ENABLED=true
MCP_OAUTH_CIMD_ENABLED=true
PUBLIC_URL=https://your-directus-url.com
```

Once configured, the Server URL you use in Claude Desktop is simply:

```
https://your-directus-url.com/mcp
```

> **Note:** The rest of this guide uses the **Static Token** method in all examples. If you choose OAuth, simply use the URL without the `?access_token=...` part.

---

## Step 3 : Add the Connector in Claude Desktop

Choose the section that matches your Claude plan. All steps below are based on the [official Claude custom connectors guide](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

> **Plan availability:** Custom connectors are available on **Free, Pro, Max, Team, and Enterprise** plans. Free users are limited to **1 connector**. This feature is currently in beta.

---

### Free Plan Users

You can add one custom connector.

1. Open **Claude Desktop** and sign in.
2. Go to **Customize → Connectors**.
3. Click **Add custom connector**.
4. Click **"Add your connector's remote MCP server URL."**
5. Paste your Server URL from the table in [Step 4](#step-4--your-environment-connector-urls).
6. Click the confirmation button to save.
7. Review and accept any permission prompts.

> **Note:** Free plan is limited to 1 active connector. Choose the environment you use most (we recommend **Production**).

---

### Pro and Max Plan Users

1. Open **Claude Desktop** and sign in.
2. Go to **Customize → Connectors**.
3. Click to **add a new connector**.
4. Click **"Add your connector's remote MCP server URL."**
5. Enter the connector details:
   - **Name:** e.g. `Directus MCP – Production`
   - **Server URL:** Use the URL from the table in [Step 4](#step-4--your-environment-connector-urls)
6. Optionally click **Advanced settings** to enter an OAuth Client ID and Secret (only needed if using OAuth, skip for Static Token).
7. Click the confirmation button to save.
8. Review and **accept the permissions** when prompted.

You can add all three environments (Production, Staging, Dev) as separate connectors and switch between them as needed.

---

### Team and Enterprise Plan Users

Connectors for Team and Enterprise plans are managed in two stages: an **Owner** sets up the connector for the organisation, then each **member** connects individually.

#### Owner steps : add the connector for your organisation

1. Open **Claude Desktop** and sign in as an Owner or Primary Owner.
2. Navigate to **Organisation Settings → Connectors**.
3. Click the button to **add a new connector**.
4. Hover over **"Custom"**, then select **"Web"**.
5. Paste your Server URL from the table in [Step 4](#step-4--your-environment-connector-urls).
6. Optionally click **Advanced settings** to enter an OAuth Client ID and Secret.
7. Click the confirmation button to finish.
8. Share the connector name with your team so they can find and connect to it.

> **Tip:** Add all three environments as separate connectors so team members can choose the right one.

#### Member steps : connect to the connector your Owner added

After the Owner configures the connector, each team member authenticates individually. This ensures Claude only accesses data that **you** personally have permission to see.

1. Open **Claude Desktop** and sign in.
2. Navigate to **Customize → Connectors**.
3. Find the connector your Owner added in the list, it will be marked as an organisation connector.
4. Click **Connect**.
5. Complete the authentication flow when prompted. This is a **one-time step** per connector.

---

### Enabling a Connector in a Conversation

Connectors are **not active by default** in every chat, you choose when to use one.

1. Start a new conversation in **Claude Desktop**.
2. Click the **"+" button** on the lower left of the chat input area.
3. Select the connector you want to use for this session.
4. Claude will now have access to your Directus data for this conversation.

---

### Editing a Connector

> **Important:** Claude does not support editing a connector in place. To update a connector (e.g. to use a new token), you must **remove it first, then re-add it** with the updated details.

---

### Removing a Connector

1. Go to **Customize → Connectors**.
   - Team/Enterprise Owners: go to **Organisation Settings → Connectors** instead.
2. Locate the connector you want to remove.
3. Click the **removal option** next to it.
4. Follow the prompts to confirm removal.

---

## Step 4 : Your Environment Connector URLs

Use the table below to configure each connector. Replace `YOUR_TOKEN` with the token you generated in Step 2.

| Environment | Connector Name              | Server URL (Static Token)                                                | Server URL (OAuth)                       |
| ----------- | --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| Production  | `Directus MCP – Production` | `https://content.botg.cloud/mcp?access_token=YOUR_PROD_TOKEN`            | `https://content.botg.cloud/mcp`         |
| Staging     | `Directus MCP – Staging`    | `https://staging.content.botg.cloud/mcp?access_token=YOUR_STAGING_TOKEN` | `https://staging.content.botg.cloud/mcp` |
| Dev         | `Directus MCP – Dev`        | `https://dev.content.botg.cloud/mcp?access_token=YOUR_DEV_TOKEN`         | `https://dev.content.botg.cloud/mcp`     |

**Example : Production connector with a static token:**

```
Name:       Directus MCP – Production
Server URL: https://content.botg.cloud/mcp?access_token=2ecR7PLJIpOZZOMUUaOERZWkKv....
```

> **Recommendation:** Start with the **Staging** or **Dev** environment while you get familiar with the connector. Switch to Production once you're comfortable.

---

## Tips, Security & Troubleshooting

### Security best practices

- **Never share your access token** with anyone or commit it to a code repository.
- **Use environment-specific tokens** : one per environment, so you can revoke them independently.
- **Review permissions carefully** when Claude asks for them. Only accept what you expect the connector to need, and deny access if requested permissions seem unnecessary.
- **Only connect to trusted servers.** Custom connectors allow Claude to access and potentially modify data in connected services. Directus MCP is trusted, but be cautious with any third-party connectors.
- **Watch for unexpected tool behaviour.** Server developers may update tool behaviour if Claude starts doing something unexpected with your data, disconnect the connector and review.
- **Claude connects from Anthropic's cloud**, not from your local machine. Your Directus URLs must be publicly accessible over the internet all three environments listed in this guide already meet this requirement.

> **Using Claude Research with connectors?** If you use the Research feature, Claude can invoke connector tools automatically. Disable any write-action tools before starting a Research session to avoid unintended changes to your content.

### Troubleshooting

| Problem                         | What to check                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Claude says it can't connect    | Confirm MCP is enabled in Directus Settings for that environment                           |
| "Unauthorised" or "403" error   | Your token may have expired or been regenerated, create a new one and update the connector |
| Connector not appearing in chat | Make sure you've toggled the connector on inside the conversation                          |
| Wrong data showing              | Double-check you're using the correct environment's URL and token                          |

---

## What Can You Do Once Connected?

Once the connector is active in a conversation, you can ask Claude things like:

- _"List all hotels currently published in Directus."_
- _"Show me the latest 5 items added to the hotels collection."_
- _"What fields does the `hotels` collection have?"_
- _"Find any hotel entries missing a description."_

Claude will use the MCP connection to query your Directus data and respond with real, live information from your CMS.

---

## References

- [Directus MCP Installation Guide](https://directus.com/docs/guides/ai/mcp/installation#connect-your-ai-client) : Official Directus documentation for setting up and configuring the MCP server.
- [Claude Custom Connectors – Remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) : Official Claude support article covering connector setup for all plan types.
- [Directus MCP OAuth](https://directus.com/docs/guides/ai/mcp/oauth#enable-the-oauth-routes-and-a-registration-mode) : Official Directus documentation for setting up OAuth for MCP.
