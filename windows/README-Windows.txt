STILLTIME — WINDOWS PORTABLE / WINDOWS 离线便携版
===================================================

QUICK START / 快速开始
----------------------
1. Extract the entire ZIP to a normal folder.
   将 ZIP 完整解压到普通文件夹中，请勿直接在压缩包内运行。

2. Double-click Start-Stilltime.cmd.
   双击 Start-Stilltime.cmd。

3. Stilltime opens automatically in fullscreen Kiosk mode.
   Stilltime 会自动以 Kiosk 全屏模式打开。

4. Press Alt+F4 to exit.
   按 Alt+F4 退出。

No network connection, installation, Node.js, login, or administrator
permission is required. Microsoft Edge is preferred; Google Chrome is used
as a fallback. At least one of these browsers must already be installed.

无需网络、安装、Node.js、登录或管理员权限。启动器优先使用 Microsoft
Edge，也支持 Google Chrome。电脑上至少需要安装其中一个浏览器。


HOW IT WORKS / 工作方式
-----------------------
The launcher starts a tiny server that listens only on this computer
(127.0.0.1), then opens the bundled page in browser Kiosk mode. When the
Kiosk browser closes, the local server exits automatically.

启动器会开启一个仅限本机访问的临时服务（127.0.0.1），然后通过浏览器
Kiosk 模式打开包内页面。关闭全屏浏览器后，本地服务会自动退出，不会常驻。

Settings are stored in:
%LOCALAPPDATA%\Stilltime\BrowserProfile

用户设置保存在：
%LOCALAPPDATA%\Stilltime\BrowserProfile


TROUBLESHOOTING / 故障排除
--------------------------
- Always extract the complete ZIP first. The site folder must remain next to
  the launcher files.
- If Windows asks whether PowerShell may communicate on a network, deny public
  network access if you prefer. Stilltime binds only to the loopback address.
- If an organization manages your browser, its Kiosk or PowerShell policy may
  prevent startup. Open site\index.html manually and press F11 as a fallback.
- The "Keep screen awake" option works best in this launcher because localhost
  is treated as a secure browser context. Windows power or organization policy
  can still override the browser.

- 请务必先完整解压，site 文件夹需与启动器保持相对位置不变。
- 如果 Windows 询问 PowerShell 网络权限，可以拒绝公用网络访问；Stilltime
  仅绑定本机回环地址。
- 如果单位策略禁止 Kiosk 或 PowerShell，可手动打开 site\index.html，
  然后按 F11 作为备用方案。
- “Keep screen awake”在此启动器中效果最好，但 Windows 电源策略或单位策略
  仍可能拥有更高优先级。
