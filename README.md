# Toggl to Clockify

CLI tool to load Toggl data into Clockify.

# DEPRECATION NOTICE!

### I'M NO LONGER SUPPORTING THIS TOOL. I'VE REDIRECTED MY EFFORTS TOWARDS [THE WEB VERSION](https://github.com/mikerourke/toggl-to-clockify-web)

The web version will be undergoing beta testing soon (week of April
22nd), I'll provide a link to the hosted tool here as soon as it's
ready.

**I'm aware that the tool currently doesn't work, but at this point
fixing it would take some serious effort. Don't worry though, you won't
need to wait long!**

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
### npm
```bash
$ npm install -g toggl-to-clockify
```

### Yarn
```bash
yarn global add toggl-to-clockify
```

## Prerequisites
- **Node.js >= v10.3.0** (uses Async Iterators)
- [Toggl API token](https://github.com/toggl/toggl_api_docs#api-token)
- [Clockify API key](https://clockify.github.io/clockify_api_docs/#authentication)

## Instructions
- Run the command `toggl-to-clockify init` with an optional output path using the `-o` flag to generate a configuration file
  - If you don't specify `-o`, a new file named `t2c.json` will be placed in the current working directory
- Populate the `email`, `togglApiToken`, `clockifyApiToken` fields
- For the `workspaces` field, specify an array of objects that match this format:
  ```json
  {
    "name": "Toggl Workspace Name",
    "years": [
      2016,
      2017
    ]
  }
  ```
  <sub>Note: The `name` is the name of the Workspace from Toggl you wish to copy, the `years` is an array of years to include in the transfer</sub>

- Before initializing the transfer, you **must** create the workspaces on Clockify with the same name as Toggl (you can always change them later)
- Run the command `toggl-to-clockify transfer` to perform the transfer

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
| `--tool`   | `-t`   | Yes   | Tool to get data for (`toggl` or `clockify`)                         |
| `--config` | `-c`   | No    | Path to the populated configuration file                             |
| `--output` | `-o`   | No    | Output path for the JSON file (default is current working directory) |

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Todo
- [X] Publish to npm
- [ ] Add comments to code
- [X] Add tests for `/utils`
- [ ] Add tests for `/tools`
- [ ] Add tests for `/cmds`
- [ ] Add automatic CHANGELOG generation
