# Welcome to Logos Storage

Logos Storage aims at being a resilient, decentralized and censorship-resistance storage layer for
the Logos stack. At present, Logos Storage provides a basic filesharing layer, not unlike IPFS or
Bittorrent, which allows users to publish and share files with one another.

Moving forward, Logos Storage will enable full provider and downloader anonymity, as well as
anonymous persistence. Check out [our roadmap](https://roadmap.logos.co/storage/roadmap/) for more details.

## Using Logos Storage

Logos Storage can currently be used in the following ways:

**Logos Storage UI App.**

* The [Logos Storage UI App](https://github.com/logos-co/logos-storage-ui) is a desktop application which allows one to upload and download files over the Logos Storage network. This is the easiest, simplest way to try out Logos Storage.

**Programmatically.**

* **Logos Module API.** The [Logos Storage Module](https://github.com/logos-co/logos-storage-module) - a high-level C++ API - is the recommended way of using Logos Storage in your app. Make sure to check: [[API Tutorial](https://logos-co.github.io/logos-storage-module/api_tutorial.html) | [API reference](https://logos-co.github.io/logos-storage-module/api_reference.html)]

* **libstorage.** [libstorage](https://github.com/logos-co/logos-storage-nim) is a lower-level C API that goes under the Logos Module API. If you need to construct bindings for a language other than C++, this is what you would use. We have [Go](https://github.com/logos-storage/logos-storage-go), [Rust](https://github.com/nipsysdev/storage-rust-bindings), and higher-level, simple [C](https://github.com/logos-storage/easylibstorage) bindings available. [[API tutorial](./libstorage-tutorial.md) | [API reference](https://github.com/logos-storage/logos-storage-nim/blob/master/library/README.md)]
