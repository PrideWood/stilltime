# Stilltime

Stilltime is a quiet, low-power ambient clock designed for a secondary display — especially the 12.3-inch, 3:2 screen in a Microsoft Surface Pro 6. It is inspired by the restraint and distance readability of dedicated desktop clocks, without imitating a flip clock.

## Use it

1. Download or clone this folder.
2. Double-click `index.html`.
3. Move the browser window to the Surface display.
4. Press **F11** for browser fullscreen.

No server, account, build step, font download, API, or network connection is needed. Settings use `localStorage` when the browser permits it; if storage is unavailable under `file://`, the clock continues with its defaults.

For Windows, the downloadable portable package includes a double-click launcher that opens Stilltime in Edge or Chrome Kiosk fullscreen mode and runs the page entirely offline. Extract the complete ZIP, run `Start-Stilltime.cmd`, and press **Alt+F4** to exit.

Windows portable releases are available from the repository's [Releases](https://github.com/PrideWood/stilltime/releases). Maintainers can reproduce a package with `./scripts/build-windows-package.sh <version>`.

The optional seven-segment clock face uses the bundled DSEG7 Classic font by Keshikan under the SIL Open Font License 1.1; its license is included in `assets/fonts/DSEG-LICENSE.txt`.

## Controls

The clock starts immediately with a clean screen. Move the pointer into the narrow strip at the far-right edge, or use a shortcut, to reveal settings. The panel closes half a second after the pointer leaves it.

| Key | Action |
| --- | --- |
| `F` | Try webpage fullscreen |
| `S` | Open or close settings |
| `Space` | Open or close settings |
| `T` | Cycle theme |
| `L` | Switch layout |
| `D` | Show or hide the date |
| `Esc` | Close settings |

Double-clicking the empty clock area also requests webpage fullscreen. Browser security rules may reject that request; F11 remains the most reliable option on Windows.

## Optional focus and screen controls

The original clock remains the default. Enable **Use Pomodoro timer** in settings to replace it with a 25-minute focus countdown, with optional 15, 45, and 60-minute durations and pause/reset controls. Turning the mode off restores the normal clock immediately.

**Keep screen awake** uses the browser Screen Wake Lock API. Current Edge and Chrome builds generally require a secure page and may pause the lock when the tab is hidden. Stilltime automatically asks again when the page becomes visible; unsupported browsers and restricted `file://` sessions show a status message and continue normally.

## Display care

Anti-static display is enabled by default. It uses low-frequency CSS transitions and one-shot timers rather than continuous JavaScript rendering:

- Pixel position changes every 60–180 seconds.
- Spacing, scale, and position drift every 10–20 minutes.
- Auto layout changes every 30–60 minutes between center, lower-left, and split-right compositions.
- Brightness changes imperceptibly over an 11-minute cycle.
- Background treatment changes every 7–12 minutes.
- After two hours, pixel shifting becomes slightly wider.
- After four hours, an occasional 20-second dim-and-return rest begins every 60–90 minutes.

Movement always stays inside generous safe margins. Choose **Subtle** (default), **Normal**, or turn anti-static display off in settings.

## Performance

Stilltime has no Canvas, WebGL, animation-frame loop, analytics, service worker, external asset, or recurring network request. With seconds hidden, the clock wakes only at the next minute plus its infrequent display-care timers. All named timers replace their previous instance and are cleared when the page is left, preventing timer accumulation during long sessions.

## Browser support

The responsive layout uses viewport units and `clamp()` sizing for 3:2, 16:10, 16:9, and 4:3 displays. It is intended for current Microsoft Edge, Chrome, Firefox, and Safari. The system font stack prioritizes Segoe UI on Windows and uses tabular numerals for a steady clock width.

## Project structure

```text
stilltime/
├── index.html
├── style.css
├── app.js
├── assets/fonts/
└── README.md
```

## License

This project is available under the MIT License.
