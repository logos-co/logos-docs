---
title: Build a Logos C++ UI module
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: iurimatias, Khushboo-dev-cpp, kashepavadan
owner: logos
doc_version: 1
slug: build-a-logos-cpp-ui-module
---

# Build a Logos C++ UI module

#### Get started building a ui_qml module with a C++ backend that runs in a separate process.

This guide shows you how to build a `calc_ui_cpp` module — a QML view backed by a C++ plugin that runs in a separate `ui-host` process. This is Part 2 of the Logos module tutorial series; it extends the `calc_module` you built in [Part 1](wrap-a-c-library-as-a-logos-core-module.md).

**Before you start:**

- Completed [Part 1](wrap-a-c-library-as-a-logos-core-module.md) — a working `calc_module` with the shared library built (`.so` on Linux, `.dylib` on macOS) in `logos-calc-module/lib/`
- Nix with flakes enabled
- Basic familiarity with [QML](https://doc.qt.io/qt-6/qmlapplications.html)

## What to expect

- You will have a working `calc_ui_cpp` module with a QML view and a C++ backend running in a separate process.
- You will understand how the `.rep` file, generated source/replica classes, and `LogosModules` SDK fit together.
- You will be able to build, run, and live-reload the module using `nix run`.

## Step 1: Scaffold the module project

Initialise a new directory and apply the `ui-qml-backend` template from `logos-module-builder`.

{% hint style="info" %}
The generated `flake.nix` uses an unpinned `logos-module-builder` URL. Replace it with the pinned version in [Step 7](#step-7-configure-flakenix) to ensure reproducible builds.
{% endhint %}

1. Run the scaffold command:

   ```bash
   mkdir logos-calc-ui-cpp && cd logos-calc-ui-cpp
   nix flake init -t github:logos-co/logos-module-builder#ui-qml-backend
   git init && git add -A
   ```

1. Rename any `ui_example` scaffold files to match the module name:

   ```bash
   mv src/ui_example_interface.h src/calc_ui_cpp_interface.h
   ```

## Step 2: Configure metadata.json

Set `metadata.json` to declare the module name, entry points, and the `calc_module` dependency.

1. Replace the contents of `metadata.json` with:

   ```json
   {
     "name": "calc_ui_cpp",
     "version": "1.0.0",
     "type": "ui_qml",
     "category": "tools",
     "description": "Calculator (C++ backend)I",
     "main": "calc_ui_cpp_plugin",
     "view": "qml/Main.qml",
     "icon": "icons/calc.png",
     "dependencies": ["calc_module"],

     "nix": {
       "packages": { "build": [], "runtime": [] },
       "external_libraries": [],
       "cmake": { "find_packages": [], "extra_sources": [] }
     }
   }
   ```

   Key fields:
   * `"type": "ui_qml"` — tells the builder this is a QML view module
   * `"main": "calc_ui_cpp_plugin"` — the backend Qt plugin library (without extension)
   * `"view": "qml/Main.qml"` — the QML entry point
   * `"dependencies": ["calc_module"]` — core modules the backend calls

1. Create the icon directory and add a placeholder icon:

   ```bash
   mkdir -p icons
   # Copy any PNG here — or generate a 64×64 placeholder:
   echo "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAmElEQVR4nO3QMREAIBDAsFeEN3ziCWRkoEP2XmedfX82OkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAO0BN/SiO/PatoIAAAAASUVORK5CYII=" | base64 -d > icons/calc.png
   ```

## Step 3: Define the remote interface in a .rep file

The `.rep` file defines the Qt Remote Objects interface. At build time, `repc` generates:

* `rep_calc_ui_cpp_source.h` — `CalcUiCppSimpleSource` with virtual slots the backend overrides
* `rep_calc_ui_cpp_replica.h` — `CalcUiCppReplica` with typed methods and auto-synced properties

1. Create `src/calc_ui_cpp.rep`:

   ```rep
   class CalcUiCpp
   {
       PROP(QString status READWRITE)

       SLOT(int add(int a, int b))
       SLOT(int multiply(int a, int b))
       SLOT(int factorial(int n))
       SLOT(int fibonacci(int n))
       SLOT(QString libVersion())
   }
   ```

   `PROP` values auto-sync from the backend, while `SLOT` return values are delivered as `QRemoteObjectPendingReply` — use `logos.watch()` in QML to get them as JS Promises.

1. Set `src/calc_ui_cpp_interface.h` to:

   ```cpp
   #pragma once

   #include <QObject>
   #include <QString>
   #include "interface.h"

   class CalcUiCppInterface : public PluginInterface
   {
   public:
       virtual ~CalcUiCppInterface() = default;
   };

   #define CalcUiCppInterface_iid "org.logos.CalcUiCppInterface"
   Q_DECLARE_INTERFACE(CalcUiCppInterface, CalcUiCppInterface_iid)
   ```

   The plugin header must include `calc_ui_cpp_interface.h` and use `Q_PLUGIN_METADATA(IID CalcUiCppInterface_iid FILE "metadata.json")` and `Q_INTERFACES(CalcUiCppInterface)`. A mismatch between the filename and IID symbol causes build errors or plugin-load failures at runtime.

## Step 4: Configure CMakeLists.txt

1. Replace the contents of `CMakeLists.txt` with:

   ```cmake
   cmake_minimum_required(VERSION 3.14)
   project(CalcUiCppPlugin LANGUAGES CXX)

   if(DEFINED ENV{LOGOS_MODULE_BUILDER_ROOT})
       include($ENV{LOGOS_MODULE_BUILDER_ROOT}/cmake/LogosModule.cmake)
   else()
       message(FATAL_ERROR "LogosModule.cmake not found. Set LOGOS_MODULE_BUILDER_ROOT.")
   endif()

   logos_module(
       NAME calc_ui_cpp
       REP_FILE src/calc_ui_cpp.rep
       SOURCES
           src/calc_ui_cpp_interface.h
           src/calc_ui_cpp_plugin.h
           src/calc_ui_cpp_plugin.cpp
   )
   ```
   
   The `REP_FILE` argument tells `logos_module()` to run `repc`, generate `LogosViewPluginBase`, and build a separate `calc_ui_cpp_replica_factory` shared library.

## Step 5: Write the C++ backend plugin

The backend inherits from three base classes: `CalcUiCppSimpleSource` (generated from `.rep`), `CalcUiCppInterface` (standard Logos plugin interface), and `CalcUiCppViewPluginBase` (generated, provides `setBackend()` and `enableRemoting()`).

1. Create `src/calc_ui_cpp_plugin.h`:

   ```cpp
   #pragma once

   #include <QString>
   #include <QVariantList>
   #include "calc_ui_cpp_interface.h"
   #include "LogosViewPluginBase.h"
   #include "rep_calc_ui_cpp_source.h"

   class LogosAPI;
   class LogosModules;

   class CalcUiCppPlugin : public CalcUiCppSimpleSource,
                           public CalcUiCppInterface,
                           public CalcUiCppViewPluginBase
   {
       Q_OBJECT
       Q_PLUGIN_METADATA(IID CalcUiCppInterface_iid FILE "metadata.json")
       Q_INTERFACES(CalcUiCppInterface)

   public:
       explicit CalcUiCppPlugin(QObject* parent = nullptr);
       ~CalcUiCppPlugin() override;

       QString name()    const override { return "calc_ui_cpp"; }
       QString version() const override { return "1.0.0"; }

       Q_INVOKABLE void initLogos(LogosAPI* api);
       
       // Slots from .rep — override the generated virtuals
       int add(int a, int b) override;
       int multiply(int a, int b) override;
       int factorial(int n) override;
       int fibonacci(int n) override;
       QString libVersion() override;

   signals:
       void eventResponse(const QString& eventName, const QVariantList& args);

   private:
       LogosAPI* m_logosAPI = nullptr;
       LogosModules* m_logos = nullptr;
   };
   ```

1. Create `src/calc_ui_cpp_plugin.cpp`:

   ```cpp
   #include "calc_ui_cpp_plugin.h"
   #include "logos_api.h"
   #include "logos_sdk.h"

   CalcUiCppPlugin::CalcUiCppPlugin(QObject* parent)
       : CalcUiCppSimpleSource(parent) {}

   CalcUiCppPlugin::~CalcUiCppPlugin() { delete m_logos; }

   void CalcUiCppPlugin::initLogos(LogosAPI* api)
   {
       m_logosAPI = api;
       m_logos = new LogosModules(api);

       // Register this object as the Remote Objects source
       setBackend(this);
   }

   int CalcUiCppPlugin::add(int a, int b)
   {
       return m_logos->calc_module.add(a, b);
   }

   int CalcUiCppPlugin::multiply(int a, int b)
   {
       return m_logos->calc_module.multiply(a, b);
   }

   int CalcUiCppPlugin::factorial(int n)
   {
       return m_logos->calc_module.factorial(n);
   }

   int CalcUiCppPlugin::fibonacci(int n)
   {
       return m_logos->calc_module.fibonacci(n);
   }

   QString CalcUiCppPlugin::libVersion()
   {
       return m_logos->calc_module.libVersion();
   }
   ```

   The constructor calls `CalcUiCppSimpleSource(parent)`, not `QObject(parent)`. `initLogos()` calls `setBackend(this)` to register with the Remote Objects host. `m_logos->calc_module.add(a, b)` uses the generated typed SDK with no `QVariant` marshalling. Slots return values directly — they travel back to the QML replica via Qt Remote Objects.

## Step 6: Write the QML view

Replace the starter `Main.qml` with the calculator UI. Use `logos.module()` to get the typed replica and `logos.watch()` to handle slot return values as JS Promises.

1. Create `src/qml/Main.qml`:

   ```qml
   import QtQuick
   import QtQuick.Controls
   import QtQuick.Layouts


   Item {
       id: root

       property string result: ""
       property string errorText: ""

       // Typed replica of the backend running in ui-host
       readonly property var backend: logos.module("calc_ui_cpp")

       // "status" property from the .rep — auto-synced via Qt Remote Objects
       readonly property string status: backend ? backend.status : ""

       function callCalc(method, args) {
           if (!backend) {
               root.errorText = "Backend not available"
               return
           }
           root.errorText = ""
           root.result = "..."

           // logos.watch() wraps the pending reply in a JS Promise
           logos.watch(backend[method].apply(backend, args),
               function(value) { root.result = String(value) },
               function(error) { root.errorText = String(error) }
           )
       }

       ColumnLayout {
           anchors.fill: parent
           anchors.margins: 24
           spacing: 16

           Text {
               text: "Calculator (C++ backend)"
               font.pixelSize: 20
               color: "#ffffff"
           }

           RowLayout {
               spacing: 12

               TextField {
                   id: inputA; placeholderText: "a"
                   Layout.preferredWidth: 80
                   validator: IntValidator {}
               }
               TextField {
                   id: inputB; placeholderText: "b"
                   Layout.preferredWidth: 80
                   validator: IntValidator {}
               }
               Button {
                   text: "Add"
                   onClicked: root.callCalc("add", [parseInt(inputA.text) || 0,
                                                     parseInt(inputB.text) || 0])
               }
               Button {
                   text: "Multiply"
                   onClicked: root.callCalc("multiply", [parseInt(inputA.text) || 0,
                                                          parseInt(inputB.text) || 0])
               }
           }

           Rectangle {
               Layout.fillWidth: true; height: 56
               color: root.errorText ? "#3d1a1a" : "#1a2d1a"
               radius: 8
               Text {
                   anchors.centerIn: parent
                   text: root.errorText || root.result || "Press a button"
                   color: root.errorText ? "#f85149" : "#56d364"
                   font.pixelSize: 15
               }
           }

           Text {
               text: "Backend status: " + root.status
               color: "#8b949e"; font.pixelSize: 13
           }
       }
   }
   ```

### Step 6.5: Use the Logos Design System in your QML (Optional)

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
    onClicked: root.callCalc("add", [parseInt(inputA.text) || 0,
                                     parseInt(inputB.text) || 0])
    }

   // Instead of TextField:
   LogosTextField {
       id: inputA
       placeholderText: qsTr("a")
   }

   // Use theme colors instead of hardcoded hex values:
   Rectangle {
        color: Theme.palette.backgroundSecondary
        radius: Theme.spacing.radiusSmall
        LogosText { text: qsTr("Result"); color: Theme.palette.text }
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

   If a token you need is missing, file a feature issue in `logos-co/logos-design-system` — don't inline a hex literal or a magic number.

1. Browse all available components by running the storybook:

   ```bash
   cd repos/logos-design-system
   nix run                  # or: ws run logos-design-system
   ```

   The sidebar splits components into two sections:

   - **Controls** — *designed per Figma, production-ready*. Use these directly. Examples: `LogosButton`, `LogosBadge`, `LogosCheckbox`, `LogosComboBox`, `LogosIconButton`, `LogosPaginator`, `LogosSearchBar`, `LogosTabBar` / `LogosTabButton`, `LogosTable` / `LogosTableColumn`, `LogosText`, `LogosTextField`, `LogosToolTip`.
   - **Controls (not designed)** — *placeholders with stable APIs but unstyled visuals*. Functional, you can ship with them, and you'll inherit the polished look automatically when each gets its design pass — no QML changes on your side. Examples: `LogosDialog`, `LogosDrawer`, `LogosFrame`, `LogosGroupBox`, `LogosItemDelegate`, `LogosMenu`, `LogosProgressBar`, `LogosRadioButton`, `LogosScrollBar` / `LogosScrollView`, `LogosSlider`, `LogosSpinBox`, `LogosSpinner`, `LogosStackView`, `LogosSwitch`, `LogosTextArea`, `LogosToolBar`.

   Each storybook page exposes a `designed: true/false` flag if you want to see at a glance which it is.

## Step 7: Configure flake.nix

Add `calc_module` as a flake input so the builder can resolve the dependency declared in `metadata.json`.

1. Replace the contents of `flake.nix` with:

   ```nix
   {
     description = "Calculator (C++ backend)";

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

    Use `github:` for a module on a remote repo or `path:` for a local directory. You can also override at build time without editing `flake.nix`:

   ```bash
   nix run . --override-input calc_module path:../logos-calc-module
   ```

## Step 8: Build and run the module

Stage all files and run the standalone app to verify the UI loads and calls the module correctly.

1. Stage all files and run:

   ```bash
   git add -A
   nix flake update # regenerate flake.lock to match the pinned inputs in flake.nix
   git add flake.lock

   # If flake.nix uses path:../logos-calc-module — run directly:
   nix run

   # If flake.nix uses github: — override to use your local checkout:
   nix run --override-input calc_module path:../logos-calc-module

   # Or from the workspace:
   ./scripts/ws run logos-calc-ui-cpp --local logos-calc-ui-cpp logos-calc-module
   ```

1. To see changes in your view entry file immediately without re-syncing, set `DEV_QML_PATH` to the directory containing `Main.qml`:

   ```bash
   DEV_QML_PATH=$PWD/src/qml nix run .
   ```

   To skip Nix re-evaluation after the first build, run the binary directly:

   ```bash
   # Build once — populates result/ in the nix store
   nix build .
   
   # Subsequent runs: invoke the bundled standalone wrapper directly,
   # skipping nix entirely. DEV_QML_PATH still redirects QML loading.
   DEV_QML_PATH=$PWD/src/qml ./result/bin/run-logos-standalone-ui
   ```

   > **Note:** `DEV_QML_PATH` is only honoured by `logos-standalone-app`, not `logos-basecamp`. See `repos/logos-standalone-app/README.md`.

## Step 9: Install into `logos-basecamp`

Bundle both modules as `.lgx` packages and install them using `lgpm`.

1. Build `.lgx` packages for both modules:

   ```bash
   # Package calc_module (from Part 1)
   cd ../logos-calc-module
   nix build '.#lgx' --out-link result-lgx
   nix build '.#lgx-portable' --out-link result-lgx-portable

   # Package the C++ UI plugin
   cd ../logos-calc-ui-cpp
   nix build '.#lgx' --out-link result-lgx
   nix build '.#lgx-portable' --out-link result-lgx-portable
   ```

1. Build `logos-basecamp`, launch it once to preinstall its bundled modules, then close it:

   ```bash
   # Build logos-basecamp
   nix build 'github:logos-co/LogosBasecamp' -o basecamp-result

   # Launch once to preinstall bundled modules, then close it
   ./basecamp-result/bin/LogosBasecamp
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
   ./basecamp-result/bin/LogosBasecamp
   ```

    {% hint style="info" %}
     The dev build requires dev `.lgx` variants (`result-lgx`). For a portable build of basecamp, use `result-lgx-portable` variants and the `LogosBasecamp` data directory instead. Mixing variants causes loading failures.
    {% endhint %}

1. Alternatively, you can install modules through the basecamp UI:

    1. Launch `logos-basecamp`
    1. Go to **Package Manager**
    1. Click **Install from file**
    1. Select `../logos-calc-module/result-lgx/*.lgx` — installs calc_module
    1. Repeat for `result-lgx/*.lgx` — installs `calc_ui_cpp`

    The "Calculator C++ UI" tab appears in the sidebar. Clicking it loads your `Main.qml`.

## Step 10: Add automated UI tests (Optional)

You can add automated UI tests that verify your module renders correctly.  The test infrastructure is built into `logos-module-builder` — add `.mjs` test files to a `tests/` directory and you can use `nix build .#integration-test` to run them.

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

   test("calc_ui_cpp: loads and shows title", async (app) => {
     await app.waitFor(
       async () => {
         await app.expectTexts(["Calculator (C++ backend)"]);
       },
       { timeout: 15000, interval: 500, description: "UI to load" },
     );
   });

   test("calc_ui_cpp: add button visible", async (app) => {
     await app.expectTexts(["Add"]);
   });

   test("calc_ui_cpp: shows connection status", async (app) => {
    await app.expectTexts(["Connecting to backend..."]);
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

## Troubleshooting the build

### The Nix build fails with linker errors?

Check that the `calc_module` shared library exists at `../logos-calc-module/lib/libcalc.so` (Linux) or `../logos-calc-module/lib/libcalc.dylib` (macOS). Rebuild it by following [Part 1](wrap-a-c-library-as-a-logos-core-module.md) if the file is missing.

### The plugin fails to load at runtime?

Verify the IID string in `calc_ui_cpp_interface.h` matches the `Q_PLUGIN_METADATA` macro in `calc_ui_cpp_plugin.h`. A mismatch causes a silent load failure.