# Toggle to Clockify

CLI tool to load Toggl data into Clockify.

**THIS IS A WORK IN PROGRESS AND MAY CAUSE A RUCKUS. DO NOT USE IF YOU HAVE A LOT OF EXISTING CLOCKIFY DATA!**

## Installation
- Install globally with `npm install -g toggl-to-clockify` or `yarn global add toggl-to-clockify`

## Prerequisites
- Toggl API key
- Clockify API key

## Instructions
1. Run the command `toggl-to-clockify init` with an optional output path using the `-o` flag to generate a configuration file
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

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Todo
- [ ] Publish to NPM
- [ ] Add comments to code
- [ ] Add tests
