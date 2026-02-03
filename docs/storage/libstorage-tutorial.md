# Getting Started with libstorage

In this tutorial, we will build a simple [libstorage-based](https://github.com/logos-storage/logos-storage-nim) C application which allows sharing files over the Logos Storage network. Since libstorage is a low-level API and its main use case are library and not  application developers, however, we will use a higher-level C wrapper developed for this tutorial which we refer to as [easylibstorage](https://github.com/logos-storage/easylibstorage).

This is, in fact, the way libstorage is supposed to be used: as the building block for higher-level libraries or language bindings. Officially, we currently provide [Go bindings](https://github.com/logos-storage/logos-storage-go-bindings) and [Rust bindings](https://github.com/logos-storage/logos-storage-rust-bindings).

# Building
To build easylibstorage, you'll need:

- git
- CMake 3.14+
- a C11 compiler
- libstorage (https://github.com/logos-storage/logos-storage-nim). To make this tutorial simpler, we suggest using the script bundled with easylibstorage (Step 2 below) to download prebuilt binaries instead of trying to build it from scratch.

**Step 1.** Clone the [easylibstorage repository](https://github.com/logos-storage/easylibstorage):

```bash
git clone https://github.com/logos-storage/easylibstorage.git
cd easylibstorage
```

**Step 2.** Download prebuilt binaries for libstorage:

```bash
./scripts/fetch-libstorage.sh
```

Ensure that the script completed successfully.

**Step 3.** Build easylibstorage:

```bash
cmake -B build -S . -DLOGOS_STORAGE_NIM_ROOT=./libstorage
cmake --build build
```

# The Application

Now that we have a working build for easylibstorage, we can focus on the application. Our application will be composed of two simple CLI apps - a file uploader and a file downloader. Once we are done, you will be able to use the application as follows:

```bash
./uploader ./myfile
./downloader <spr_string> <cid_string> ./myfile-copy
```

The meaning of `<spr_string>` and `<cid_string>` will be explained as we go.

First, create a `tutorial` folder under `easylibstorage`:

```bash
cd easylibstorage # or wherever it was that you cloned your repo
mkdir tutorial
```

### Uploader

The code for the uploader is shown in Listing 1. It first defines some configuration options for the storage node (lines 25-29), including the discovery listen port (UDP 9090), and the directory where the node will store its data (`./uploader-data`). It sets `nat` to `none` as we will be running a local node, and the bootstrap node to `NULL` as we will be creating a network from scratch.

```c
01| /* uploader.c: makes a local file available to the Logos
02| Storage network. */
03|
04| #include <stdio.h>
05| #include <stdlib.h>
06| #include "easystorage.h"
07|
08| void panic(const char *msg) {
09|     fprintf(stderr, "Panic: %s\n", msg);
10|     exit(1);
11| }
12|
13| void progress(int total, int complete, int status) {
14|     printf("\r  %d / %d bytes", complete, total);
15|     fflush(stdout);
16| }
17|
18| int main(int argc, char *argv[]) {
19|     if (argc < 2) {
20|         printf("Usage: %s <filepath>\n", argv[0]);
21|         exit(1);
22|     }
23|
24|     node_config cfg = {
25|             .disc_port = 9090,
26|             .data_dir = "./uploader-data",
27|             .log_level = "INFO",
28|             .bootstrap_node = NULL,
29|             .nat = "none",
30|     };
31|
32|     char *filepath = argv[1];
33|
34|     STORAGE_NODE node = e_storage_new(cfg);
34|     if (node == NULL) panic("Failed to create storage node");
35|     if (e_storage_start(node) != RET_OK) panic("Failed to start storage node");
36|
37|     char *cid = e_storage_upload(node, filepath, progress);
38|     if (cid == NULL) panic("Upload failed");
39|     char *spr = e_storage_spr(node);
40|     if (spr == NULL) panic("Failed to get node's signed peer record");
41|
42|     printf("Run: downloader %s %s ./output-file\n", spr, cid);
45|
46|     printf("\nPress Enter to exit\n");
47|     getchar();
48|
49|     printf("Deleting file (this could take a while)...");
50|     fflush(stdout);
51|     if (e_storage_delete(node, cid) != RET_OK) panic("Failed to delete file");
52|     printf("Done\n");
53|
54|     free(cid);
55|     free(spr);
56|     e_storage_stop(node);
57|     e_storage_destroy(node);
58|
59|     return 0;
60| }
```
**Listing 1.** Uploader.

It then starts the node (line 37), and uploads the file into the local node (line 37). From that moment on, the file becomes available over the network. The program then gathers some critical pieces of information we will need later:

* the node's [Signed Peer Record](https://github.com/libp2p/specs/blob/master/RFC/0002-signed-envelopes.md). This a string encoding our node's public key, its network ID, and its connection addresses. It can be used to find the node in the network.
* the Content ID ([CID](https://github.com/multiformats/cid)). This is a string that uniquely identifies the file we have just uploaded within the network.

Those get printed to stdout (line 42), and the program them pauses until the user presses Enter (line 46). After that, the program deletes the file from the local node (line 49), and finally stops and destroys the node (lines 54-57).

You should place the listing above in an `uploader.c` file in the `easylibstorage/tutorial` folder you created before.

### Downloader

```c
01| /* downloader.c: Download files from a Logos Storage node into the local disk.
02|  */
03| #include <stdio.h>
04| #include <stdlib.h>
05| #include "easystorage.h"
06|
07| void panic(const char *msg) {
08|     fprintf(stderr, "Panic: %s\n", msg);
09|     exit(1);
10| }
11|
12| void progress(int total, int complete, int status) {
13|     printf("\r  %d / %d bytes", complete, total);
14|     fflush(stdout);
15| }
16|
17| int main(int argc, char *argv[]) {
18|     if (argc < 4) {
19|         printf("Usage: %s BOOTSTRAP_SPR CID <output_file>\n", argv[0]);
20|         exit(1);
21|     }
22|
23|     char *spr = argv[1];
24|     char *cid = argv[2];
25|     char *filepath = argv[3];
26|
27|     node_config cfg = {
28|             .api_port = 8081,
29|             .disc_port = 9091,
30|             .data_dir = "./downloader-data",
31|             .log_level = "INFO",
32|             .bootstrap_node = spr,
33|             .nat = "none",
34|     };
35|
36|     STORAGE_NODE node = e_storage_new(cfg);
37|     if (e_storage_start(node) != RET_OK) panic("Failed to start storage node");
38|     if (e_storage_download(node, cid, filepath, progress) != RET_OK)
39|         panic("Failed to download file");
40|     e_storage_stop(node);
41|     e_storage_destroy(node);
42| }
```
**Listing 2.** Downloader.

### Build

To build the downloader, you will need to modify the `CMakeLists.txt` file in the `easylibstorage` folder so that it builds our new files. You can append the following to the end of the file:

```cmake
# ---- Tutorial uploader/downloader
add_executable(uploader tutorial/uploader.c)
add_executable(downloader tutorial/downloader.c)

target_link_libraries(uploader PRIVATE easystorage)
target_link_libraries(downloader PRIVATE easystorage)
target_link_libraries(uploader PRIVATE ${LIBSTORAGE_PATH})
target_link_libraries(downloader PRIVATE ${LIBSTORAGE_PATH})
```

This will make sure that cmake will include the right files and libraries as it tries to build our files. Now run cmake as before:

```bash
cmake -B build -S . -DLOGOS_STORAGE_NIM_ROOT=./libstorage
cmake --build build
```

And you should end up with two executables under `./build`: `uploader` and `downloader`.

### Run

**Upload.** To upload a file, do:

```bash
./build/uploader ./myfile
```

and replace `myfile` with a file you would like to upload. This will print something like:

```bash
> ./build/uploader ./myfile
...

Run: downloader spr:CiUIAhIhAkHse4QPQIFlu0xeE9ebpASP946ZRgvUpQEcCsGEc73MEgIDARpJCicAJQgCEiECQex7hA9AgWW7TF4T15ukBI_3jplGC9SlARwKwYRzvcwQkp6IzAYaCwoJBH8AAAGRAiOCGgsKCQTAqFj-kQIjgipGMEQCICMJdw19UmnubC5zeaV2TwSzMRr_sc1U057YwnvFhOkGAiB7020QxcZJ1kL_xrDLpzEnHEgkTVogydnsuR0oevFFbg zDvZRwzm4ABJVP5E6ujcsvZmJjaH76bhaJivirnMhrrhisYbxdGy ./output-file

Press Enter to exit
```

This will start up the node and upload a file to it. The node will then be left running until you press Enter in the terminal. Leave it running and open a new terminal.

You can now copy the line after `Run: downloader` and paste it into the new terminal to download the file:

```bash
./build/downloader spr:CiUIAhIhAkHse4QPQIFlu0xeE9ebpASP946ZRgvUpQEcCsGEc73MEgIDARpJCicAJQgCEiECQex7hA9AgWW7TF4T15ukBI_3jplGC9SlARwKwYRzvcwQkp6IzAYaCwoJBH8AAAGRAiOCGgsKCQTAqFj-kQIjgipGMEQCICMJdw19UmnubC5zeaV2TwSzMRr_sc1U057YwnvFhOkGAiB7020QxcZJ1kL_xrDLpzEnHEgkTVogydnsuR0oevFFbg zDvZRwzm4ABJVP5E6ujcsvZmJjaH76bhaJivirnMhrrhisYbxdGy ./output-file
```

The command should eventually finish, and you should end up with a file named `./output-file`. You can now test that the two files are indeed the same. The command:

```bash
cmp ./myfile ./output-file
```

should return nothing.

And there you have it! You have just uploaded and downloaded a file over the Logos Storage network using libstorage.