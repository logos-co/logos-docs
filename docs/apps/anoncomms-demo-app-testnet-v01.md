# Documentation packet (Doc Packet) for Testnet v0.1 docs

## A. Outcome + value (required)

- **Outcome (end goal):** User will send anonymous chat messages over the mixnet by discovering mix nodes through Logos capability discovery.
- **Why it matters:** Proves two core testnet v0.1 primitives work end-to-end: capability-based node discovery and anonymous message routing via the mixnet.

## B. Scope + ownership

- **Journey name:** Use the Mix Push Message App to send messages over the libp2p mixnet
- **Owner (GitHub + Discord):** [GitHub](https://github.com/chaitanyaprem), Discord: prem_chaitanya
- **Applies to:**
  - [Chat UI App](https://github.com/logos-co/logos-chat-ui), branch: logos-testnet-demo
  - [Chat module](https://github.com/logos-co/logos-chat-module), branch: logos-testnet-demo
  - [Waku Module](https://github.com/logos-co/logos-waku-module), branch: logos-testnet-demo

- **Runtime target:** Logos testnet v0.1.

## C. Runnable happy path

- **Prereqs:**
  - Operating Systems: Linux or macOS
  - Build Tools:
    - CMake (3.16 or later)
    - Ninja build system
    - pkg-config
    - nix
- **Commands:**
  1. Clone the chat-ui repo

     ```shell
     git clone git@github.com:logos-co/logos-chat-ui.git
     ```

  2. Change into the repo directory and check out the demo branch

     ```shell
     cd logos-chat-ui
     git checkout logos-testnet-demo
     ```

  3. Build the standalone application. You should not see any errors in the console.

     ```shell
     nix build '.#app'
     ```

     If you don't have flakes enabled globally, add experimental flags:

     ```shell
     nix build '.#app' --extra-experimental-features 'nix-command flakes'
     ```

  4. Run the application

     ```shell
     ./result/bin/logos-chat-ui-app
     ```

- **Expected outputs:**
  1.  Once the app is up and running, the user should see the UI with the following:
      - Status shown as Ready
      - LP Peer count increasing over time before stabilizing
      - Mix peer count increasing over time before stabilizing
      - Warning message `Waiting for network peers...` disappears once 3 mix nodes are discovered.
  2.  After sending a message from the app (which is possible once the warning message disappears), the app should display the same message in the `Messages` section.
      Note that it takes some time for this to happen due to latency introduced by mix nodes.
  3.  After sending a message, there are two methods to check if the message was delivered successfully:

      - The message appears in the `Messages` section in the UI.
      - The following logs appear in the console indicating success:

        ```
        [LOGOS_HOST "waku_module" ]: "WakuModulePlugin: Lightpush publish initiated successfully for topic: \"\""
        ChatBackend: Sent message to channel "baixa-chiado"
        ```

## D. Configuration

- **Required env vars / flags / config keys:** Not Applicable
- **Example config snippet:** No config, everything should work out of the box.
- **Default ports/endpoints:**
  - The user's machine should be able to connect to external fleet nodes using `TCP` port `60000` for discovery, sending, and receiving messages.
  - Connectivity and message reception will improve if the user's machine is reachable externally (even if behind a NAT).

## E. Hardware requirements (required for node/client journeys)

- **Target devices:** Nothing specific for this app. Any general restrictions placed by Logos modules should be considered.
- **Minimum requirements:**
  - CPU — 1 core
  - RAM — 2 GB
  - Storage (type + free space) — at least 20 GB of free space for building everything
  - Network bandwidth — No specific requirements
- **Recommended requirements:** Same as minimum requirements
- **Storage profile:** No specific storage required.

## F. Verify + troubleshoot

- **Verification step:** Run the app and confirm a sent message appears in the `Messages` section.
- **Known failures (top 3-5):**
  1. Orphan processes when killing the app via CLI or GUI
     - Symptom — Sometimes the child processes are orphaned when the app is killed. Check using the command below:

       ```shell
       ps -eaf | grep -i logos_host
       ```

     - Cause (if known) — Issue in liblogos
     - Fix/workaround — Kill orphaned processes:

       ```shell
       pkill -f logos_host
       ```

  2. Sent messages may not appear in the received messages section if the underlying connectivity of `Waku-relay` is not healthy.

## G. Limits for v0.1

- **Known issues:**
  1. It may take 30 seconds to 1 minute to discover mix nodes. Until then, no messages can be sent using the app.
  2. If the app is killed, some child processes are orphaned and continue running in the background. They must be killed before restarting the app, otherwise it may not work properly. Note that this may also kill any other `logos_host` processes running.

## H. References

- **Existing sources:**
  - [Extended Kademlia Discovery with capability filtering](https://lip.logos.co/ift-ts/raw/extended-kad-disco.html)
  - [LIBP2P-MIX](https://lip.logos.co/ift-ts/raw/mix.html)
  - [Waku mix](https://github.com/logos-messaging/specs/blob/master/standards/core/mix.md)

---

### Time and Security (optional)

- **Estimated time-to-complete:** 15-20 minutes
- **Security / safety notes:** None
