# Mobile development

For a USB-connected Android phone/emulator, enable USB debugging, accept the
computer authorization on the phone, and run from this directory:

```powershell
npm.cmd run start:usb
```

Keep the terminal open. The launcher advertises `127.0.0.1:8081`, forwards both
Metro (`8081`) and the local API (`5000`), and restores forwarding after USB or
ADB reconnects. It also handles phones attached after startup. Start the mobile
backend separately (`npm.cmd start` in `mobile/backend`); USB forwarding does not
start the API or database.

If this project's Metro is already running with a loopback address, the command
reuses it and starts the forwarding guard instead of choosing a different port.
With `--android`, an already-running development client is brought forward
without re-entering the Dev Launcher URL loader. This preserves its React
context and navigation and avoids the observed duplicate-context native crash.
If the app is on Expo's launch-error screen, `npm.cmd run start:usb -- --android`
closes that failed session and reopens the current USB server URL.
When deliberately switching Metro origins or native builds, close the old
development app before opening the new session.
If an existing Metro advertises an old LAN IP, stop its terminal once and rerun
the command above, then open the new development-client URL. A different process
or project occupying the port is reported without stopping it.

`npm.cmd start` automatically selects USB loopback when an authorized Android
device is connected. `start:localhost` is an alias for the same IPv4-safe setup.
The launcher finds ADB through explicit `ADB`, Android SDK variables, the usual
Windows SDK location, repository `platform-tools`, or PATH.

For Wi-Fi development, run `npm.cmd start -- --lan`; the phone and computer must
have a reachable LAN route. Explicit LAN mode still maintains USB forwarding
when a device is connected. `npm.cmd run start:tunnel` tunnels Metro; configure
a separately reachable API URL when using a remote API.

Checks:

```powershell
node --test tests/dev-connection.test.cjs
```

This setup removes dependence on Wi-Fi IP changes during USB development. It
cannot keep a phone connected while the USB cable, ADB authorization, Metro or
the backend is unavailable. It does not change production API configuration.

Release bundles ignore Metro host metadata. Set `EXPO_PUBLIC_API_BASE_URL` to
the intended public HTTPS API origin before building. Invalid URLs, credentials
in URLs, cleartext origins and private/loopback origins are rejected by the
release runtime, which uses the bundled public HTTPS fallback instead. A
trailing slash is normalized. Development builds still support explicit local
HTTP APIs and Metro-derived LAN/USB addresses.
