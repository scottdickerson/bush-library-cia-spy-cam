# Starting the Electron app automatically

How to make a Windows 11 PC sign in at boot, start this app fullscreen, and keep visitors out of Windows. Compares the options, records what this kiosk uses, and recommends an approach for future kiosks.

## Summary

| Option | Runs an Electron app | Official | Removes taskbar / Explorer | Restarts app if it quits | Windows edition |
|---|---|---|---|---|---|
| Assigned Access, single-app kiosk | ❌ UWP apps and Edge only | ✅ | ✅ | ✅ | Pro and up |
| Assigned Access, restricted user experience (**this kiosk**) | ✅ | ✅ | ❌ Explorer runs, taskbar hidden | ❌ | Pro and up |
| **Shell Launcher v2 (recommended for future kiosks)** | ✅ | ✅ | ✅ | ✅ | Enterprise, Education, IoT Enterprise |
| `Winlogon\Shell` registry replacement (backup) | ✅ | ❌ | ✅ | ❌ | Any |

## Assigned Access, single-app kiosk

What **Settings > Accounts > Other users > Kiosk** sets up, and what `setup-kiosk.ps1 -Mode Kiosk` configures. Microsoft's docs say it runs "a single Universal Windows Platform (UWP) application or Microsoft Edge", fullscreen above the lock screen, and restarts it if it closes.

It can't run an Electron app. That's why the Settings panel doesn't list it, and why a script-configured attempt on the HCHM Extraordinary Stories kiosk failed with "We weren't able to start your app" (0x80004005). Packaging the app as MSIX doesn't make it a UWP app.

## Assigned Access, restricted user experience (what this kiosk uses)

Set up by `setup-kiosk.ps1` (the default mode); see the README's **Windows kiosk setup**. Windows signs into a kiosk account, launches the app, allows only listed apps to run, and hides the taskbar. Works on Windows Pro.

Limits:

- Explorer still runs underneath, so Windows touch gestures can still reach it. On this kiosk a one-finger swipe up from the bottom of the touchscreen showed the taskbar, and a three-finger swipe down minimized the app (show desktop).
- Windows doesn't relaunch the app if it quits; restart the PC.

Workarounds in place on this kiosk:

- **Edge swipes off** for every account: `AllowEdgeSwipe` = 0 (`setup-kiosk.ps1`).
- **Multi-finger gestures off** in the Elo touch driver's configuration (works for every account). `kiosk-user-settings.ps1` also sets `TouchGestureSetting` = 0 for the kiosk account, a community-reported value Microsoft doesn't document.
- **Taskbar on the main display only** (`MMTaskbarEnabled` = 0, `kiosk-user-settings.ps1`), with the large non-touch screen set as the main display, so the touchscreen has no taskbar to swipe up. Confirmed to stop the bottom-edge swipe here, but only because the touchscreen is a second display.

**Single-touchscreen kiosks** (most kiosks) can't use that last workaround: the only display is the main one, so it always has a taskbar, and in restricted mode a one-finger swipe up from the bottom can show it. For those, don't run Explorer at all: Shell Launcher v2 on Enterprise / IoT Enterprise, or the `Winlogon\Shell` replacement on Pro.
- **Touchscreen mapped to its monitor** with Tablet PC Settings, so the app puts each window on the right display (see the README's **The windows are on the wrong displays**).

## Shell Launcher v2 (recommended for future kiosks)

Microsoft's supported way to run a desktop app as a kiosk. It replaces Explorer with the app for the kiosk account, so there's no taskbar, Start menu, or desktop for gestures to reach. It watches the app and, when it exits, restarts the app, restarts the PC, or shuts down (configurable). A desktop app can open windows on several monitors, which this two-screen app needs.

Requirements and limits:

- **Windows 11 Enterprise, Education, or IoT Enterprise** (including LTSC). Not Pro. IoT Enterprise LTSC suits exhibit PCs: it's aimed at fixed-purpose devices and gets security fixes for years without feature updates.
- Point it at the app's own `.exe`. Shell Launcher monitors the process it starts, so a launcher stub that starts another process and exits looks like a crash. `CIA Spycam.exe` from the electron-builder zip is the app itself.
- The app runs with the kiosk account's rights, so make it a standard (non-admin) account.
- Configure it after Windows' first-run setup (OOBE), not in the image before it.
- Explorer doesn't run, but keep `AllowEdgeSwipe` = 0 and any touch driver gesture settings as extra protection.

Configured with the AssignedAccess / Shell Launcher CSP (Intune or other MDM), a provisioning package, or WMI from PowerShell. Microsoft's [Shell Launcher v2 samples](https://github.com/microsoft/Windows-IoT-Samples/tree/master/samples/ShellLauncher/ShellLauncherV2) have XML configurations to start from. A `setup-shell-launcher.ps1` for this repo can be written once there's an Enterprise or IoT Enterprise test machine.

## `Winlogon\Shell` registry replacement (backup)

For Windows Pro, where Shell Launcher isn't available. Set the kiosk account's shell to the app:

```
HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon
  Shell (REG_SZ) = C:\Program Files\CIA Spycam\CIA Spycam.exe
```

The app starts instead of Explorer at sign-in, so there's no taskbar or desktop. Not officially supported, and:

- Use it **instead of** Assigned Access (run `remove-kiosk.ps1` first); Assigned Access manages the shell itself and may conflict.
- Set up automatic sign-in yourself, for example with Sysinternals Autologon.
- Nothing restarts the app if it quits: the screen stays black until the PC restarts. Ctrl+Alt+Del still works for staff.
- Keep the popup settings from `kiosk-user-settings.ps1`.

## Sources

- [Assigned Access overview](https://learn.microsoft.com/en-us/windows/configuration/assigned-access/) (Microsoft Learn)
- [Shell Launcher overview](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/) (Microsoft Learn)
- [Shell Launcher v2 samples](https://github.com/microsoft/Windows-IoT-Samples/tree/master/samples/ShellLauncher/ShellLauncherV2) (GitHub)
- [Turning off three- and four-finger gestures](https://learn.microsoft.com/en-us/answers/questions/1610651/i-need-to-understand-how-to-turn-off-three-and-fou) (Microsoft Q&A, community answer)
