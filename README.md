# Codesistant

Codesistant is a CLI tool designed to assist with code generation and completion using OpenAI's GPT-4 model. It watches specified files and directories for changes and updates an OpenAI assistant with the current state of the codebase, helping users complete their projects with consistent style and structure.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
    - [Commands](#commands)
- [Configuration](#configuration)
- [Development](#development)
- [License](#license)

## Installation

To install Codesistant, you need to have Node.js and npm installed. Then, follow these steps:

1. Install the Codesistant package globally:
   ```sh
   npm install -g codesistant
   ```

## Usage

Codesistant can be used via the command line. The following commands are available:

### Commands

- **init**: Create a default `config.yml` in the current directory.
  ```sh
  codesistant init
  ```

- **watch**: Start the watch process based on the configuration provided.
  ```sh
  codesistant watch
  ```

### Options

- `--config, -c`: Path to the config file (default: `./config.yml`)
- `--proxy`: Proxy URL
- `--openai`: OpenAI API Key
- `--assistant`: OpenAI assistant ID
- `--model`: OpenAI model to use (default: `gpt-4o`)
- `--prompt`: System prompt (default: a predefined prompt)
- `--files`: List of files and directories to watch
- `--throttle`: Throttle value in milliseconds (default: `2000`)
- `--dburl`: Database connection URL for MySQL or PostgreSQL

Example:
```sh
codesistant watch --config ./config.yml --openai <your-openai-key> --assistant <your-assistant-id>
```

## Configuration

The configuration file (`config.yml`) specifies the settings for Codesistant. You can generate a default configuration file using the `init` command. Here is an example configuration:

```yaml
proxy: '<optional proxy url>'
openai: '<required openai api key>'
assistant: '<required assistant id in openai>'
model: 'gpt-4o'
prompt: 'Below are snippets of code from the same project. Help the user complete the parts of the project they request based on the existing code. Adhere to the same style, structure, and approaches.'
files:
  - './example/path/to/dir/watch'
  - './support/**/glob/templates'
  - './example/**/somedir/*.js'
throttle: 2000
dburl: '<optional database connection url>'
```

## License

This project is licensed under the ISC License.

---

Happy coding with Codesistant! If you encounter any issues or have any questions, feel free to open an issue on the project's GitHub page.
