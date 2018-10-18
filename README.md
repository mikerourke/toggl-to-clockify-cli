# Toggle to Clockify

CLI tool to load Toggl data into Clockify.

## Functionality
Transfers the following entities from Toggl to Clockify:
- Projects
- Clients
- Time Entries
- Tags

It creates these entities in Clockify if they don't already exist

## Disclaimers and Notes (PLEASE READ!)
- This will transfer **ALL** entries from Toggl to Clockify from the workspaces and years specified in the config file
- There are **NO** checks for pre-existing entries, so if you try running it multiple times, it will create duplicate entries
  - I plan to add a check in the future, but for now that's the way the cookie crumbles
- If you're starting with a fresh Clockify account, you can always leave the workspace to delete all entries and recreate

## Installation
- Install globally with `npm install -g toggl-to-clockify` or `yarn global add toggl-to-clockify`

## Prerequisites
- [Toggl API token](https://github.com/toggl/toggl_api_docs#api-token)
- [Clockify API key](https://clockify.github.io/clockify_api_docs/#authentication)

## Instructions
1. Run the command `toggl-to-clockify init` with an optional output path using the `-o` flag to generate a configuration file
  - If you don't specify `-o`, a new file named `t2c.json` will be placed in the current working directory
2. Populate the `email`, `togglApiToken`, `clockifyApiToken` fields
3. For the `workspaces` field, specify an array of objects that match this format:
```json
{
  "name": "<Toggl Workspace Name>",
  "years": [
    2016,
    2017
  ]
}
```
The `name` is the name of the Workspace from Toggl you wish to copy, the `years` is an array of years to include in the transfer

4. Before initializing the transfer, you **must** create the workspaces on Clockify with the same name as Toggl (you can always change them later)
5. Run the command `toggl-to-clockify transfer` to perform the transfer

## Commands

### `init`
Creates configuration file for specifying API keys and workspaces

#### Flags
| Option     | Alias | Req'd | Description                           |
|------------|-------|-------|---------------------------------------|
| `--output` | `-o`  | No    | Output path to the configuration file |

### `transfer`
Transfers projects from Toggl to Clockify

#### Flags
| Option     | Alias  | Req'd | Description                              |
|------------|--------|-------|------------------------------------------|
| `--config` | `-c`   | No    | Path to the populated configuration file |

### `write`
Fetches data from API and writes a to JSON file, this is just for giggles, in case you were interested in what currently exists for either tool

#### Flags
| Option     | Alias  | Req'd | Description                                                          |
|------------|--------|-------|----------------------------------------------------------------------|
| `--tool`   | `-t`   | Yes   | Tool to get data for ("toggl" or "clockify")                         |
| `--config` | `-c`   | No    | Path to the populated configuration file                             |
| `--output` | `-o`   | No    | Output path for the JSON file (default is current working directory) |

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Todo
- [X] Publish to NPM
- [ ] Add comments to code
- [ ] Add tests
