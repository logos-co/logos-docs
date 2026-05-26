---
title: Build a Logos QML UI module
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: iurimatias, Khushboo-dev-cpp, kashepavadan
owner: logos
doc_version: 1
slug: build-a-logos-qml-ui-module.md
---

# Build a Logos QML UI module

#### Get started adding a user interface to a Logos core module using QML.

This guide shows you how to build a `calc_ui` QML plugin that calls the `calc_module` you created in [Part 1](tutorial-wrapping-c-library.md). A QML UI plugin requires no compilation — it is a set of `.qml` files plus a `metadata.json`. The host (`logos-basecamp` or `logos-standalone-app`) injects a `logos` bridge object that lets QML call any loaded core module via `logos.callModule("module", "method", [args])`.

**Before you start**, make sure you have the following:

- Completed [Part 1](tutorial-wrapping-c-library.md) — a working `calc_module` with the shared library built (`.so` on Linux, `.dylib` on macOS) in `logos-calc-module/lib/`
- Nix with flakes enabled
- Basic familiarity with [QML](https://doc.qt.io/qt-6/qmlapplications.html)

## What to expect

- You will have a running `calc_ui` plugin with input fields and buttons that call `calc_module` arithmetic methods through the Logos bridge.
- You will be able to iterate on the QML view using `nix run` with live reloading via `DEV_QML_PATH`.
- You will be able to install the plugin into `logos-basecamp` using `lgpm`.

> [!TIP]
>
>  Check out an [example](https://github.com/fryorcraken/logos-tictactoe-qml) of a working core module with a QML UI.

## Step 1: Scaffold the module project

Use the QML module template from `logos-module-builder` to create the project structure.

> [!NOTE]
>
>  The generated `flake.nix` uses an unpinned `logos-module-builder` URL. Replace it with the pinned version in [Step 4](#step-4-configure-flakenix) to ensure reproducible builds.

1. Run the scaffold command:

   ```bash
   mkdir logos-calc-ui && cd logos-calc-ui
   nix flake init -t github:logos-co/logos-module-builder#ui-qml
   git init && git add -A
   ```

1. Confirm the generated files are present:

   ```bash
   ls flake.nix metadata.json Main.qml
   ```

## Step 2: Configure metadata.json

Replace the template `metadata.json` with your plugin's details. The `nix` section is used by the builder — keep it as-is.

1. Replace the contents of `metadata.json` with:

   ```json
   {
     "name": "calc_ui",
     "version": "1.0.0",
     "description": "Calculator UI - QML frontend for the calc_module",
     "type": "ui_qml",
     "view": "Main.qml",
     "dependencies": ["calc_module"],
     "category": "tools",
     "icon": "icons/calc.png",

     "nix": {
       "packages": {
         "build": [],
         "runtime": []
       },
       "external_libraries": [],
       "cmake": {
         "find_packages": [],
         "extra_sources": [],
         "extra_include_dirs": [],
         "extra_link_libraries": []
       }
     }
   }
   ```

1. Create the icon directory and add a placeholder icon:

   ```bash
   mkdir -p icons
   # Copy any PNG here — or generate a 64×64 placeholder:
   echo "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAmElEQVR4nO3QMREAIBDAsFeEN3ziCWRkoEP2XmedfX82OkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAO0BN/SiO/PatoIAAAAASUVORK5CYII=" | base64 -d > icons/calc.png
   ```

   The `view` field tells the host which QML file to load. Each entry in `dependencies` must match the `name` field in that module's own `metadata.json`, and the flake input attribute name must also match — e.g., `calc_module.url = "github:logos-co/logos-tutorial?dir=logos-calc-module"`.

## Step 3: Write the QML view

Replace the starter `Main.qml` with the calculator UI. The file demonstrates two communication patterns: direct calls where `logos.callModule()` returns a result synchronously, and event-based calls where the module emits a `"versionReady"` event received via `logos.onModuleEvent()`.

1. Replace `Main.qml` with:

   ```qml
   import QtQuick
   import QtQuick.Controls
   import QtQuick.Layouts

   Item {
       id: root

       property string result: ""
       property string errorText: ""
       property string versionFromEvent: ""

       // ── Event subscription ────────────────────────────────────
       // Subscribe to "versionReady" events pushed from calc_module.
       Component.onCompleted: {
           if (typeof logos !== "undefined" && logos.onModuleEvent)
               logos.onModuleEvent("calc_module", "versionReady")
       }

       Connections {
           target: typeof logos !== "undefined" ? logos : null
           function onModuleEventReceived(moduleName, eventName, data) {
               if (eventName === "versionReady")
                   root.versionFromEvent = data[0]
           }
       }

       ColumnLayout {
           anchors.fill: parent
           anchors.margins: 24
           spacing: 16

           // ── Title ──────────────────────────────────────────────
           Text {
               text: "Logos Calculator"
               font.pixelSize: 20
               font.weight: Font.DemiBold
               color: "#ffffff"
               Layout.alignment: Qt.AlignHCenter
           }

           // ── Pattern 1: Direct call (request -> response) ──────
           Text {
               text: "Direct calls (logos.callModule -> returns result)"
               color: "#8b949e"
               font.pixelSize: 12
           }

           RowLayout {
               spacing: 12
               Layout.fillWidth: true

               TextField {
                   id: inputA
                   placeholderText: "a"
                   Layout.preferredWidth: 80
                   validator: IntValidator {}
               }

               TextField {
                   id: inputB
                   placeholderText: "b"
                   Layout.preferredWidth: 80
                   validator: IntValidator {}
               }

               Button {
                   text: "Add"
                   onClicked: callTwoOp("add", inputA.text, inputB.text)
               }

               Button {
                   text: "Multiply"
                   onClicked: callTwoOp("multiply", inputA.text, inputB.text)
               }
           }

           RowLayout {
               spacing: 12
               Layout.fillWidth: true

               TextField {
                   id: inputN
                   placeholderText: "n"
                   Layout.preferredWidth: 80
                   validator: IntValidator { bottom: 0 }
               }

               Button {
                   text: "Factorial"
                   onClicked: callOneOp("factorial", inputN.text)
               }

               Button {
                   text: "Fibonacci"
                   onClicked: callOneOp("fibonacci", inputN.text)
               }

               Button {
                   text: "libcalc version"
                   onClicked: callModule("libVersion", [])
               }
           }

           // Direct call result
           Rectangle {
               Layout.fillWidth: true
               height: 56
               color: root.errorText.length > 0 ? "#3d1a1a" : "#1a2d1a"
               radius: 8

               Text {
                   anchors.centerIn: parent
                   text: root.errorText.length > 0 ? root.errorText
                           : (root.result.length > 0 ? root.result : "Enter values and press a button")
                   color: root.errorText.length > 0 ? "#f85149" : "#56d364"
                   font.pixelSize: 15
               }
           }

           // ── Pattern 2: Event-based (fire-and-forget -> event) ─
           Text {
               text: "Event-based (fire-and-forget call -> result via event)"
               color: "#8b949e"
               font.pixelSize: 12
           }

           RowLayout {
               spacing: 12
               Layout.fillWidth: true

               Button {
                   text: "libcalc version (event)"
                   onClicked: {
                       if (typeof logos !== "undefined" && logos.callModule)
                           logos.callModule("calc_module", "libVersionNotify", [])
                   }
               }
           }

           // Event result
           Rectangle {
               Layout.fillWidth: true
               height: 56
               color: "#1a1a2d"
               radius: 8

               Text {
                   anchors.centerIn: parent
                   text: root.versionFromEvent.length > 0
                         ? ("Version (via event): " + root.versionFromEvent)
                         : "Press the event button — result arrives via event"
                   color: "#7ab8ff"
                   font.pixelSize: 15
               }
           }

           Item { Layout.fillHeight: true }
       }

       // ── Direct call helpers ───────────────────────────────────

       function callModule(method, args) {
           root.errorText = ""
           root.result = ""

           if (typeof logos === "undefined" || !logos.callModule) {
               root.errorText = "Logos bridge not available"
               return
           }

           root.result = String(logos.callModule("calc_module", method, args))
       }

       function callTwoOp(method, a, b) {
           if (a === "" || b === "") { root.errorText = "Enter values for a and b"; return }
           callModule(method, [parseInt(a), parseInt(b)])
       }

       function callOneOp(method, n) {
           if (n === "") { root.errorText = "Enter a value for n"; return }
           callModule(method, [parseInt(n)])
       }
   }
   ```

   The `logos` object is injected by the host at runtime. For polished visuals, replace raw Qt controls with `logos-design-system` equivalents (`LogosButton`, `LogosTextField`) and use `Theme.palette.*` tokens instead of hardcoded hex values — see [Step 6](#step-7-use-the-logos-design-system-in-your-qml-optional) for more information.

## Step 4: Configure flake.nix

Add `calc_module` as a flake input so the builder can resolve the dependency declared in `metadata.json`.

> [!NOTE]
>
>  `calc_module` must be built with its shared library present in `lib/`. A missing library causes the Nix build to fail with linker errors. See [Part 1](tutorial-wrapping-c-library.md) for build instructions.

1. Replace the contents of `flake.nix` with:

   ```nix
   {
     description = "Calculator QML UI Plugin for Logos - frontend for calc_module";

     inputs = {
       logos-module-builder.url = "github:logos-co/logos-module-builder";

       # Option A: point to a remote repo (for CI or when calc_module is published)
       calc_module.url = "github:logos-co/logos-tutorial?dir=logos-calc-module";

       # Option B: point to your local checkout (for local development)
       # calc_module.url = "path:../logos-calc-module";
     };

     outputs = inputs@{ logos-module-builder, ... }:
       logos-module-builder.lib.mkLogosQmlModule {
         src = ./.;
         configFile = ./metadata.json;
         flakeInputs = inputs;
       };
   }
   ```

   The input attribute name (`calc_module`) must match the dependency name in `metadata.json`. Use `github:` for a module on a remote repo; use `path:` for a local directory. You can also override at build time without editing `flake.nix`:

   ```bash
   nix run . --override-input calc_module path:../logos-calc-module
   ```

## Step 5: Run and test the module

Stage all files and run the standalone app to verify the UI loads and calls the module correctly.

1. Stage and run:

   ```bash
   git add -A
   nix flake update # regenerate flake.lock to match the pinned inputs in flake.nix
   git add flake.lock
   nix run .
   ```

   This will open your app and call the underlying module whenever you interact with the UI.
   
   If you did not yet add `calc_module.url` to `flake.nix`, clicking buttons shows "Logos bridge not available" — use this to verify the layout. To then test with your local `calc_module`, override the input:

   ```bash
   nix run . --override-input calc_module path:../logos-calc-module
   ```

1. To see changes in your view entry file immediately without re-syncing, set `DEV_QML_PATH` to the directory containing `Main.qml`:

   ```bash
   DEV_QML_PATH=$PWD nix run .
   ```

   To skip Nix involvement after the first build, run the binary directly:

   ```bash
   # Build once — populates result/ in the nix store
   nix build .

   # Subsequent runs: invoke the bundled standalone wrapper directly,
   # skipping nix entirely. DEV_QML_PATH still redirects QML loading.
   DEV_QML_PATH=$PWD ./result/bin/{your binary name}
   ```

> [!NOTE]
>
>  `DEV_QML_PATH` is only honoured by `logos-standalone-app`, not `logos-basecamp`.

## Step 6: Install into logos-basecamp

Bundle both modules as `.lgx` packages and install them using `lgpm`.

1. Build `.lgx` packages for both modules:

   ```bash
   # Package calc_module (from Part 1)
   cd ../logos-calc-module
   nix build '.#lgx' --out-link result-lgx
   nix build '.#lgx-portable' --out-link result-lgx-portable

   # Package the QML UI plugin
   cd ../logos-calc-ui
   nix build '.#lgx' --out-link result-lgx
   nix build '.#lgx-portable' --out-link result-lgx-portable
   ```

1. Build `logos-basecamp`, launch it once to preinstall its bundled modules, then close it:

   ```bash
   # Build logos-basecamp
   nix build 'github:logos-co/logos-basecamp' -o basecamp-result

   # Launch once to preinstall bundled modules, then close it
   ./basecamp-result/bin/logos-basecamp
   ```

1. Set `BASECAMP_DIR` to your platform's data directory. To find where it is, check the log output for plugins directory or look for the directory that contains modules/ and plugins/ subdirectories.

   ```bash
   # macOS:
   BASECAMP_DIR="$HOME/Library/Application Support/Logos/LogosBasecampDev"

   # Linux:
   BASECAMP_DIR="$HOME/.local/share/Logos/LogosBasecampDev"
   ```

   Then, install both modules with `lgpm`:

   ```bash
   # Build lgpm CLI
   nix build 'github:logos-co/logos-package-manager#cli' --out-link ./pm

   # Install core module
   ./pm/bin/lgpm --modules-dir "$BASECAMP_DIR/modules" \
     install --file ../logos-calc-module/result-lgx/*.lgx

   # Install UI plugin
   ./pm/bin/lgpm --ui-plugins-dir "$BASECAMP_DIR/plugins" \
     install --file result-lgx/*.lgx

   # Launch basecamp -- your modules appear alongside the built-in ones
   ./basecamp-result/bin/logos-basecamp
   ```

    > [!NOTE]
    >
    >  The dev build requires dev `.lgx` variants (`result-lgx`). For a portable build of basecamp, use `result-lgx-portable` variants and the `LogosBasecamp` data directory instead. Mixing variants causes loading failures.

1. Alternatively, you can install modules through the basecamp UI:

    1. Launch `logos-basecamp`
    1. Go to **Package Manager**
    1. Click **Install from file**
    1. Select `../logos-calc-module/result-lgx/*.lgx` — installs calc_module
    1. Repeat for result-lgx/*.lgx — installs calc_ui

    The "Calculator UI" tab appears in the sidebar. Clicking it loads your Main.qml.

## Step 7: Use the Logos Design System in your QML (Optional)

`logos-basecamp` (and `logos-standalone-app`) has `logos-design-system` on its QML import path. Use its themed components directly to automatically give your module a polished, consistent look.

1. Add the imports at the top of `Main.qml`:

   ```qml
   import Logos.Theme
   import Logos.Controls
   import Logos.Icons        // optional: shared icon assets (LogosIcons.search, .install, .refresh, …)
   ```

1. Replace raw Qt controls with Logos equivalents:

   ```qml
   // Instead of Button:
   LogosButton {
       text: qsTr("Add")
       onClicked: callTwoOp("add", inputA.text, inputB.text)
   }

   // Instead of TextField:
   LogosTextField {
       id: inputA
       placeholderText: qsTr("a")
   }

   // Use theme colors instead of hardcoded hex values:
   Rectangle {
       color: Theme.palette.backgroundSecondary
       Text { color: Theme.palette.text }
   }
   ```

1. Use theme tokens instead of hardcoded values:

   ```qml
   // Palette  — Theme.palette.*
   //   background, backgroundSecondary, backgroundMuted, surface,
   //   text, textSecondary, textMuted, textTertiary,
   //   border, borderSubtle, primary, success, warning, error, info, hover, pressed, …

   // Spacing  — Theme.spacing.*
   //   tiny, small, medium, large, xlarge, xxlarge,
   //   radiusSmall, radiusMedium, radiusLarge

   // Typography  — Theme.typography.*
   //   pageTitleText (36), titleText (30), panelTitleText (24),
   //   subtitleText (16), primaryText (14), secondaryText (12),
   //   weightRegular (400), weightMedium (500), weightBold (700),
   //   publicSans (font family)

   // Icons  — Logos.Icons.LogosIcons.*
   //   arrowLeft, arrowRight, refresh, install, trash, more, search, …
   ```

   If a token you need is missing, file a feature issue — don't inline a hex literal or a magic number; that just stores up drift.

1. Browse all available components by running the storybook:

   ```bash
   cd repos/logos-design-system
   nix run                  # or: ws run logos-design-system
   ```

   The sidebar splits components into two sections:

   - **Controls** — *designed per Figma, production-ready*. Use these directly. Examples: `LogosButton`, `LogosBadge`, `LogosCheckbox`, `LogosComboBox`, `LogosIconButton`, `LogosPaginator`, `LogosSearchBar`, `LogosTabBar` / `LogosTabButton`, `LogosTable` / `LogosTableColumn`, `LogosText`, `LogosTextField`, `LogosToolTip`.
   - **Controls (not designed)** — *placeholders with stable APIs but unstyled visuals*. Functional, you can ship with them, and you'll inherit the polished look automatically when each gets its design pass — no QML changes on your side. Examples: `LogosDialog`, `LogosDrawer`, `LogosFrame`, `LogosGroupBox`, `LogosItemDelegate`, `LogosMenu`, `LogosProgressBar`, `LogosRadioButton`, `LogosScrollBar` / `LogosScrollView`, `LogosSlider`, `LogosSpinBox`, `LogosSpinner`, `LogosStackView`, `LogosSwitch`, `LogosTextArea`, `LogosToolBar`.

   Each storybook page exposes a `designed: true/false` flag if you want to see at a glance which it is.

## Step 8: Add automated UI tests (Optional)

You can add automated UI tests that verify your QML plugin renders correctly.  The test infrastructure is built into `logos-module-builder` — add `.mjs` test files to a `tests/` directory and you can use `nix build .#integration-test` to run them.

Tests use the [logos-qt-mcp](https://github.com/logos-co/logos-qt-mcp) test framework, which connects to the QML inspector inside `logos-standalone-app` and can find elements, click buttons, verify text, and take screenshots.

1. Create `tests/ui-tests.mjs`:

   ```javascript
   import { resolve } from "node:path";

   // CI sets LOGOS_QT_MCP automatically; for interactive use: nix build .#test-framework -o result-mcp
   const root =
     process.env.LOGOS_QT_MCP ||
     new URL("../result-mcp", import.meta.url).pathname;
   const { test, run } = await import(
     resolve(root, "test-framework/framework.mjs")
   );

   test("calc_ui: loads and shows title", async (app) => {
     await app.waitFor(
       async () => {
         await app.expectTexts(["Calculator"]);
       },
       { timeout: 15000, interval: 500, description: "calc_ui to load" },
     );
   });

   test("calc_ui: add button visible", async (app) => {
     await app.expectTexts(["Add"]);
   });

   test("calc_ui: click add and check result", async (app) => {
     await app.click("Add");
     // Verify the result appears (depends on your UI)
     await app.waitFor(
       async () => {
         await app.expectTexts(["Result:"]);
       },
       { timeout: 5000, interval: 500, description: "result to appear" },
     );
   });

   run();
   ```

1. Run the tests:

   ```bash
   git add tests/

   # Hermetic CI test (builds everything, runs headless)
   nix build .#integration-test -L

   # Interactive: build test framework, run against a running app
   nix build .#test-framework -o result-mcp
   nix run .          # start the app with inspector on :3768
   node tests/ui-tests.mjs  # in another terminal
   ```

   The `integration-test` output launches `logos-standalone-app` with `QT_QPA_PLATFORM=offscreen` (no display needed), connects to the QML inspector, and runs all `.mjs` files in `tests/`. You can have multiple test files (e.g., `tests/smoke.mjs`, `tests/interactions.mjs`) — they are all discovered and run automatically.

## Troubleshooting the module

### QML changes not appearing after rebuild?

Qt caches compiled QML on disk. Disable the cache before launching to force a fresh load:

```bash
QML_DISABLE_DISK_CACHE=1 ./basecamp-result/bin/logos-basecamp
```

### The module is not loading or basecamp is behaving unexpectedly?

The data directory can get into a bad state when switching between portable and dev builds, or when running multiple instances. Clear it and let basecamp re-preinstall on next launch:

```bash
# macOS:
rm -rf ~/Library/Application\ Support/Logos/LogosBasecampDev

# Linux:
rm -rf ~/.local/share/Logos/LogosBasecampDev

# Relaunch — basecamp will re-preinstall its bundled modules
./basecamp-result/bin/logos-basecamp
```

### QML-to-C++ type coercion behaves unexpectedly?

Arguments sent from QML via `logos.callModule()` pass through IPC as `QVariant` values. The runtime coerces mismatched types automatically — a `double` sent from QML converts to `int` if the method signature expects it.

Coercion uses `QVariant::convert()`, which rounds rather than truncates: `3.7` becomes `4`.
