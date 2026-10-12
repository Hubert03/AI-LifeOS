# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## AI planning, Notes, and workspace history

The AI planner sends the user's prompt to OpenRouter through the ASP.NET API. Its URL, model, and DPAPI-encrypted API key are stored in the local `AiLifeOS` database. Signed-in users can view and update this shared provider configuration in Settings; the API key is never returned to the browser or written to Angular files or source control. The API key is encrypted with Windows DPAPI for the current Windows user.

From the workspace folder (`C:\Users\80130\Angular`), apply the additive SQL Server LocalDB update:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\004_AddNotesActivityAndTrash.sql'
```

Apply the AI settings table update from `C:\Users\80130\Angular`:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\005_AddAiProviderSettings.sql'
```

Apply the app-data stored procedure update after scripts 001 through 005:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\006_AppDataStoredProcedures.sql'
```

Settings can be configured from the signed-in app under Settings. The existing one-time console prompt remains available; stop the API and run it from the workspace folder:

```powershell
dotnet run --project '.\backend\AiLifeOS.Api\AiLifeOS.Api.csproj' -- --configure-openrouter
```

Enter the URL and model or press Enter to accept the defaults, then enter the API key at the hidden prompt. The key is encrypted with Windows DPAPI for the current Windows user before it is saved to SQL Server LocalDB. Run the normal `dotnet run` command afterward. The API must run under the same Windows user that configured the key; moving the database to another Windows account requires configuring the key again. For production, use a managed secret store rather than this local setup flow.

The AI planner only returns a suggested draft; it does not write records until the user reviews and confirms them. Plans created from Tasks, Goals, and Notes are saved to their matching sections; Overview can save selected tasks and a goal. Prompts are sent to OpenRouter and its selected model provider, so users should not include sensitive information. Without an API key, Notes and workspace history continue to work, but the planner reports that AI is not configured.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
