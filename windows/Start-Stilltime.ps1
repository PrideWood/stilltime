$ErrorActionPreference = "Stop"

$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$siteRoot = Join-Path $packageRoot "site"
$indexPath = Join-Path $siteRoot "index.html"
$listener = $null
$browserProcess = $null

function Find-Browser {
    $candidates = @(
        @{ Name = "Edge"; Path = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" },
        @{ Name = "Edge"; Path = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" },
        @{ Name = "Edge"; Path = "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe" },
        @{ Name = "Chrome"; Path = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" },
        @{ Name = "Chrome"; Path = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" },
        @{ Name = "Chrome"; Path = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe" }
    )

    foreach ($candidate in $candidates) {
        if ($candidate.Path -and (Test-Path -LiteralPath $candidate.Path -PathType Leaf)) {
            return $candidate
        }
    }

    return $null
}

function Get-ContentType([string]$extension) {
    switch ($extension.ToLowerInvariant()) {
        ".html"  { return "text/html; charset=utf-8" }
        ".css"   { return "text/css; charset=utf-8" }
        ".js"    { return "text/javascript; charset=utf-8" }
        ".woff2" { return "font/woff2" }
        ".txt"   { return "text/plain; charset=utf-8" }
        default   { return "application/octet-stream" }
    }
}

function Send-Response(
    [System.Net.Sockets.TcpClient]$client,
    [int]$statusCode,
    [string]$statusText,
    [byte[]]$body,
    [string]$contentType
) {
    $stream = $client.GetStream()
    $header = "HTTP/1.1 $statusCode $statusText`r`n" +
              "Content-Type: $contentType`r`n" +
              "Content-Length: $($body.Length)`r`n" +
              "Cache-Control: no-cache`r`n" +
              "X-Content-Type-Options: nosniff`r`n" +
              "Connection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($body.Length -gt 0) {
        $stream.Write($body, 0, $body.Length)
    }
    $stream.Flush()
}

function Handle-Request([System.Net.Sockets.TcpClient]$client, [string]$root) {
    try {
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) { return }

        while ($true) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrEmpty($line)) { break }
        }

        $parts = $requestLine.Split(" ")
        if ($parts.Length -lt 2 -or ($parts[0] -ne "GET" -and $parts[0] -ne "HEAD")) {
            $message = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
            Send-Response $client 405 "Method Not Allowed" $message "text/plain; charset=utf-8"
            return
        }

        $requestPath = [System.Uri]::UnescapeDataString($parts[1].Split("?")[0])
        if ($requestPath -eq "/") { $requestPath = "/index.html" }
        $relativePath = $requestPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $rootFull = [System.IO.Path]::GetFullPath($root).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
        $allowedExtensions = @(".html", ".css", ".js", ".woff2", ".txt")
        $extension = [System.IO.Path]::GetExtension($filePath)

        if (-not $filePath.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -or
            $allowedExtensions -notcontains $extension.ToLowerInvariant() -or
            -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            $message = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            Send-Response $client 404 "Not Found" $message "text/plain; charset=utf-8"
            return
        }

        $body = if ($parts[0] -eq "HEAD") { [byte[]]@() } else { [System.IO.File]::ReadAllBytes($filePath) }
        Send-Response $client 200 "OK" $body (Get-ContentType $extension)
    }
    catch {
        try {
            $message = [System.Text.Encoding]::UTF8.GetBytes("Server error")
            Send-Response $client 500 "Internal Server Error" $message "text/plain; charset=utf-8"
        }
        catch {}
    }
    finally {
        $client.Close()
    }
}

try {
    if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
        throw "The site folder is incomplete. Extract the entire ZIP before starting Stilltime."
    }

    $browser = Find-Browser
    if ($null -eq $browser) {
        throw "Microsoft Edge or Google Chrome was not found. Install one of them and try again."
    }

    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    $url = "http://127.0.0.1:$port/"

    $profileRoot = Join-Path $env:LOCALAPPDATA "Stilltime\BrowserProfile"
    New-Item -ItemType Directory -Force -Path $profileRoot | Out-Null

    if ($browser.Name -eq "Edge") {
        $arguments = @(
            "--kiosk",
            $url,
            "--edge-kiosk-type=fullscreen",
            "--no-first-run",
            "--disable-session-crashed-bubble",
            "--user-data-dir=$profileRoot"
        )
    }
    else {
        $arguments = @(
            "--kiosk",
            $url,
            "--no-first-run",
            "--disable-session-crashed-bubble",
            "--user-data-dir=$profileRoot"
        )
    }

    Write-Host "Starting Stilltime in $($browser.Name) kiosk mode..."
    Write-Host "Press Alt+F4 to exit. / 按 Alt+F4 退出。"
    $browserProcess = Start-Process -FilePath $browser.Path -ArgumentList $arguments -PassThru

    while (-not $browserProcess.HasExited) {
        if ($listener.Pending()) {
            $client = $listener.AcceptTcpClient()
            Handle-Request $client $siteRoot
        }
        else {
            Start-Sleep -Milliseconds 80
            $browserProcess.Refresh()
        }
    }
}
catch {
    Write-Host ""
    Write-Host "Stilltime could not start:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    if ($null -ne $listener) {
        $listener.Stop()
    }
}
