# BulkDelete - Thunderbird MailExtension

BulkDelete is a **Thunderbird MailExtension** that allows you to efficiently bulk delete emails using multiple filtering options. Whether you need to remove just one email or clean up your inbox by sender, address, or domain, BulkDelete makes it easy.

## Features

BulkDelete provides four powerful deletion options:

1. **Delete a single email** – Manually remove a specific email.
2. **Delete all emails from a sender's name** – Deletes emails from a particular sender (e.g., `"John Doe" <john@example.com>`).
3. **Delete all emails from a sender’s address** – Removes all emails from an exact email address (e.g., `john@example.com`).
4. **Delete all emails from a domain** – Clears all emails from a specific domain (e.g., `@example.com`).

## Download

You can download the latest version of BulkDelete [here](https://github.com/LucBennett/BulkDelete/releases/latest).

## Build Instructions

To build the extension from source, follow these steps:

1. **Navigate to the project directory**: Open your terminal or command prompt and go to the project folder.
2. **Run the appropriate compile script** based on your operating system:
   - **Node.js**: Run `node compile.js` (requires Node.js).
   - **Unix & macOS**: Run `compile.sh` (requires `/bin/sh` and 7z or zip installed).
   - **Windows (with .NET)**: Run `compile.ps1` (requires PowerShell and .NET).
   - **Windows (with 7z/zip)**: Run `compile-z.ps1` (requires PowerShell and 7z or zip installed).

Alternatively, you can build the extension using:

```bash
npm run compile
```

The compiled `.xpi` file will be located in the `build` directory.

## Installation Instructions

To install BulkDelete in Thunderbird:

1. Open **Thunderbird**.
2. Navigate to **Menu** (hamburger icon) → **Add-ons and Themes**.
3. Click **Tools for Add-ons** (gear icon) → **Install Add-on From File**.
4. Select the `BulkDelete.xpi` file and install it.

## Development Workflow

To maintain a clean and efficient codebase, use the following tools:

### Prettier (Code Formatter)

Format the code by running:

```bash
npm run format
```

### ESLint (Code Linter)

Check for code issues with:

```bash
npm run lint
```

### Compiling

To compile the extension:

```bash
npm run compile
```

## Running Tests

BulkDelete includes automated tests to ensure proper functionality.

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Run the test suite**:

   ```bash
   npm run test
   ```

Running tests regularly helps catch and fix any issues before releasing updates.

## Support This Project ❤️

If you find BulkDelete useful, consider supporting development:

[![Buy me a coffee!](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/LucBenn)

## License

BulkDelete is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. See the [LICENSE](LICENSE) file for details.

## Icon Credits

The icon was created by [I Putu Kharismayadi](https://www.flaticon.com/authors/i-putu-kharismayadi) and is available on [FlatIcon](https://www.flaticon.com/free-icon/bulk-delete-emails_15953945).
