param([int]$port = 8000)
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Output "LUVITS Local Server running on http://localhost:$port/"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $rawPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath).TrimStart('/')
            if ([string]::IsNullOrEmpty($rawPath) -or $rawPath.EndsWith('/')) {
                $rawPath += "index.html"
            }
            
            $filePath = Join-Path $root $rawPath
            if (-not (Test-Path $filePath -PathType Leaf)) {
                $indexCandidate = Join-Path $filePath "index.html"
                $htmlCandidate = "$filePath.html"
                if (Test-Path $indexCandidate -PathType Leaf) {
                    $filePath = $indexCandidate
                } elseif (Test-Path $htmlCandidate -PathType Leaf) {
                    $filePath = $htmlCandidate
                }
            }
            
            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                $response.ContentType = $mime
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            $response.OutputStream.Close()
        } catch {
            # Gracefully handle client connection aborts without terminating the server loop
        }
    }
} finally {
    $listener.Stop()
}
