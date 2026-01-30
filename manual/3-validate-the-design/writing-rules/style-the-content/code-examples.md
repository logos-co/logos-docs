# Code examples

## Examples

- Code in text:

  The `greet(name)` function generates a greeting message based on the provided name parameter.

- Code block:

  The following example demonstrates a greeting system that handles multiple users and stores their greetings in a history object.

      ```js
      const greetingHistory = {};

      function greet(name) {
          return `Hello, ${name}!`;
      }

      function greetAndStore(name) {
          const greeting = greet(name);
          if (!greetingHistory[name]) {
              greetingHistory[name] = [];
          }
          greetingHistory[name].push(greeting);
          return greeting;
      }

      greetAndStore("Alice");
      greetAndStore("Bob");
      greetAndStore("Alice");
      ```

      Expected output:

      ```text
      {
        "Alice": ["Hello, Alice!", "Hello, Alice!"],
        "Bob": ["Hello, Bob!"]
      }
      ```

## Formatting

- Wrap lines at 60-80 characters.
- Use backticks (`) for inline code. Use fenced code blocks (triple backticks) and language identifiers for code blocks.

    | Language identifier type | Example |
    |:---|:---|
    | Programming or scripting language | `js`, `python`, `go` |
    | Command-line commands | `bash`, `sh` |
    | Configuration files | `json`, `yaml`, `xml` |

- Indent every line of the code block by four spaces to group the code with the description paragraph.
- Before the code example, add a description to describe the context and purpose of the example.
- Use code comments sparingly. Explain the code in the description. Include short comments inside the snippet when they prevent mistakes or clarify non-obvious behavior.
- Put information that requires special attention in [callouts](./callouts.md) after the code block.
- Place expected output in a separate code block using the `text` identifier, or explain the output using text.

## Usage

- Code examples should be concise.
- Create code examples for elements that are frequently used or hard to understand.
- Refer to [placeholders](./placeholders.md) for guidance on using placeholders in code examples.
- Refer to [Commands](./commands.md) for guidance on writing commands.
