# Toggle to Clockify

Tool to load Toggl data into Clockify.

**THIS IS A WORK IN PROGRESS AND MAY CAUSE A RUCKUS. DO NOT USE IF YOU HAVE A LOT OF EXISTING CLOCKIFY DATA!**

## Prerequisites
- Toggl API key
- Clockify API key

## Instructions
1. Install required dependencies by running `yarn install`
2. Create a copy of the `default.example.json` file in the `/config` directory named `default.json` (also in `/config`) directory
3. Populate the `email` and `apiToken` fields for `toggl` and the `apiToken` field for `clockify`
4. For the `workspaces` field, specify an array of objects that match this format:
```json
{
  "name": "[Toggl Workspace Name]",
  "years": [
    2016,
    2017,
    ...
  ]
}
```
The `name` is the name of the Workspace from Toggl you wish to copy, the `years` is an array of years to include in the transfer

5. Before initializing the transfer, you **must** create the workspaces on Clockify with the same name as Toggl (you can always change them later)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Todo

- [ ] Add comments to code
- [ ] Add tests
