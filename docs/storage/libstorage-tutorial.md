---
title: Share files over the Logos Storage network using libstorage
doc_type: procedure
product: storage
topics: [libstorage, file-sharing, c, easylibstorage]
steps_layout: sectioned
authors:
owner: logos
doc_version: 1
slug: libstorage-share-files
---

# Share files over the Logos Storage network using libstorage

#### Get started building a file uploader and downloader with the easylibstorage C wrapper.

This tutorial shows you how to use libstorage — a low-level C API — to upload and download files over the Logos Storage network. Because libstorage is designed as a building block for higher-level libraries, this tutorial uses [easylibstorage](https://github.com/logos-storage/easylibstorage), a higher-level C wrapper developed to simplify the API.

By the end of this tutorial, you will have two CLI applications: one that uploads a local file to the network and one that downloads it by content ID.

**Before you start**, ensure the following tools are installed:

- `git`
- CMake 3.14 or later
- A C11-compatible compiler

## What to expect

- You will be able to share any local file over the Logos Storage network from a self-hosted node.
- You will be able to retrieve a shared file from any machine using its SPR and CID strings.
- You will be able to verify file integrity after a network round-trip.

## Step 1: Clone and build easylibstorage locally

Clone the easylibstorage repository and fetch prebuilt libstorage binaries using the bundled script.

> **Note**
>
> Use the bundled fetch script rather than building libstorage from source — it is the simplest way to get working binaries for this tutorial.

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/logos-storage/easylibstorage.git
   cd easylibstorage
   ```

1. Download the prebuilt libstorage binaries:

   ```bash
   ./scripts/fetch-libstorage.sh
   ```

   Confirm the script completes without errors before continuing.

1. Build easylibstorage:

   ```bash
   cmake -B build -S . -DLOGOS_STORAGE_NIM_ROOT=./libstorage
   cmake --build build
   ```

## Step 2: Create the tutorial directory and source files

Create a `tutorial` folder inside the cloned repository and add the uploader and downloader source files.

1. Create the tutorial directory:

   ```bash
   mkdir tutorial
   ```

1. Create `tutorial/uploader.c` with the following content:

   ```c
   /* uploader.c: makes a local file available to the Logos Storage network. */

   #include <stdio.h>
   #include <stdlib.h>
   #include "easystorage.h"

   void panic(const char *msg) {
       fprintf(stderr, "Panic: %s\n", msg);
       exit(1);
   }

   void progress(int total, int complete, int status) {
       printf("\r  %d / %d bytes", complete, total);
       fflush(stdout);
   }

   int main(int argc, char *argv[]) {
       if (argc < 2) {
           printf("Usage: %s <filepath>\n", argv[0]);
           exit(1);
       }

       node_config cfg = {
               .disc_port = 9090,
               .data_dir = "./uploader-data",
               .log_level = "INFO",
               .bootstrap_node = NULL,
               .nat = "none",
       };

       char *filepath = argv[1];

       STORAGE_NODE node = e_storage_new(cfg);
       if (node == NULL) panic("Failed to create storage node");
       if (e_storage_start(node) != RET_OK) panic("Failed to start storage node");

       char *cid = e_storage_upload(node, filepath, progress);
       if (cid == NULL) panic("Upload failed");
       char *spr = e_storage_spr(node);
       if (spr == NULL) panic("Failed to get node's signed peer record");

       printf("Run: downloader %s %s ./output-file\n", spr, cid);
       free(cid);
       free(spr);

       printf("\nPress Enter to exit\n");
       getchar();

       e_storage_stop(node);
       e_storage_destroy(node);

       return 0;
   }
   ```

   The configuration sets the discovery port to UDP 9090, stores node data in `./uploader-data`, and sets `nat` to `none` for local-only operation.

   After upload, it prints two values you will need for the download step:
   - The node's **Signed Peer Record (SPR)** — encodes the node's public key, network ID, and connection addresses.
   - The **Content ID (CID)** — uniquely identifies the uploaded file on the network.

1. Create `tutorial/downloader.c` with the following content:

   ```c
   /* downloader.c: Download files from a Logos Storage node into the local disk. */

   #include <stdio.h>
   #include <stdlib.h>
   #include "easystorage.h"

   void panic(const char *msg) {
       fprintf(stderr, "Panic: %s\n", msg);
       exit(1);
   }

   void progress(int total, int complete, int status) {
       printf("\r  %d / %d bytes", complete, total);
       fflush(stdout);
   }

   int main(int argc, char *argv[]) {
       if (argc < 4) {
           printf("Usage: %s BOOTSTRAP_SPR CID <output_file>\n", argv[0]);
           exit(1);
       }

       char *spr = argv[1];
       char *cid = argv[2];
       char *filepath = argv[3];

       node_config cfg = {
               .api_port = 8081,
               .disc_port = 9091,
               .data_dir = "./downloader-data",
               .log_level = "INFO",
               .bootstrap_node = spr,
               .nat = "none",
       };

       STORAGE_NODE node = e_storage_new(cfg);
       if (node == NULL) panic("Failed to create storage node");
       if (e_storage_start(node) != RET_OK) panic("Failed to start storage node");
       if (e_storage_download(node, cid, filepath, progress) != RET_OK) panic("Failed to download file");
       e_storage_stop(node);
       e_storage_destroy(node);
   }
   ```

## Step 3: Update the build configuration and compile

Add the uploader and downloader targets to `CMakeLists.txt` and rebuild.

1. Append the following to the end of `CMakeLists.txt` in the `easylibstorage` root:

   ```cmake
   # Tutorial uploader/downloader
   add_executable(uploader tutorial/uploader.c)
   add_executable(downloader tutorial/downloader.c)

   target_link_libraries(uploader PRIVATE easystorage)
   target_link_libraries(downloader PRIVATE easystorage)
   target_link_libraries(uploader PRIVATE ${LIBSTORAGE_PATH})
   target_link_libraries(downloader PRIVATE ${LIBSTORAGE_PATH})
   ```

1. Rebuild the project:

   ```bash
   cmake -B build -S . -DLOGOS_STORAGE_NIM_ROOT=./libstorage
   cmake --build build
   ```

   After the build completes, the `uploader` and `downloader` executables appear under `./build/`.

## Step 4: Upload and download a file with Logos Storage

Run the uploader and then use its output to download the file in a second terminal.

1. Upload a local file:

   ```bash
   ./build/uploader ./myfile
   ```

   The program outputs a `Run:` line containing the SPR and CID strings, then waits for input. Leave this terminal open.

1. Open a second terminal and paste the `Run:` command from the uploader output. It will look similar to:

   ```bash
   ./build/downloader spr:<spr_string> <cid_string> ./output-file
   ```

   Wait for the command to finish. The file is saved to `./output-file`.

1. Verify the downloaded file is identical to the original:

   ```bash
   cmp ./myfile ./output-file
   ```

   No output means the files match.

1. Return to the first terminal and press **Enter** to shut down the uploader node.
