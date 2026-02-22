# Generate a proper multi-size ICO file for electron-builder
Add-Type -AssemblyName System.Drawing

function Create-GoBoardBitmap($size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    
    # Background - wooden board color
    $g.Clear([System.Drawing.Color]::FromArgb(218, 165, 32))
    
    $scale = $size / 256.0
    
    # Draw 4 stones in a 2x2 pattern
    $stoneSize = [int](80 * $scale)
    $pos1 = [int](40 * $scale)
    $pos2 = [int](136 * $scale)
    
    # Black stone top-left
    $g.FillEllipse([System.Drawing.Brushes]::Black, $pos1, $pos1, $stoneSize, $stoneSize)
    
    # White stone top-right
    $g.FillEllipse([System.Drawing.Brushes]::White, $pos2, $pos1, $stoneSize, $stoneSize)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::Black, [Math]::Max(1, 2*$scale))), $pos2, $pos1, $stoneSize, $stoneSize)
    
    # White stone bottom-left
    $g.FillEllipse([System.Drawing.Brushes]::White, $pos1, $pos2, $stoneSize, $stoneSize)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::Black, [Math]::Max(1, 2*$scale))), $pos1, $pos2, $stoneSize, $stoneSize)
    
    # Black stone bottom-right
    $g.FillEllipse([System.Drawing.Brushes]::Black, $pos2, $pos2, $stoneSize, $stoneSize)
    
    $g.Dispose()
    return $bmp
}

$sizes = @(16, 32, 48, 256)
$pngDataList = @()

foreach ($size in $sizes) {
    $bmp = Create-GoBoardBitmap $size
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngDataList += ,($ms.ToArray())
    $ms.Dispose()
    $bmp.Dispose()
}

# Build ICO file
$icoPath = "build\icons\icon.ico"
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)

$numImages = $sizes.Count
$headerSize = 6
$dirEntrySize = 16
$dataOffset = $headerSize + ($dirEntrySize * $numImages)

# ICO Header
$bw.Write([UInt16]0)          # Reserved
$bw.Write([UInt16]1)          # Type: 1 = ICO
$bw.Write([UInt16]$numImages) # Number of images

# Calculate offsets
$currentOffset = $dataOffset
$offsets = @()
foreach ($pngData in $pngDataList) {
    $offsets += $currentOffset
    $currentOffset += $pngData.Length
}

# Directory entries
for ($i = 0; $i -lt $numImages; $i++) {
    $size = $sizes[$i]
    $widthByte = if ($size -ge 256) { 0 } else { $size }
    $heightByte = if ($size -ge 256) { 0 } else { $size }
    
    $bw.Write([byte]$widthByte)           # Width
    $bw.Write([byte]$heightByte)          # Height
    $bw.Write([byte]0)                     # Color palette
    $bw.Write([byte]0)                     # Reserved
    $bw.Write([UInt16]1)                   # Color planes
    $bw.Write([UInt16]32)                  # Bits per pixel
    $bw.Write([UInt32]$pngDataList[$i].Length)  # Size of image data
    $bw.Write([UInt32]$offsets[$i])        # Offset of image data
}

# Image data
foreach ($pngData in $pngDataList) {
    $bw.Write($pngData)
}

$bw.Close()
$fs.Close()

Write-Host "ICO file created at $icoPath with sizes: $($sizes -join ', ')"
Write-Host "File size: $((Get-Item $icoPath).Length) bytes"
