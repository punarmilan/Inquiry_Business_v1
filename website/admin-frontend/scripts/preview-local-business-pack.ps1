$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$artifactDir = Join-Path $repoRoot 'artifacts/local-business-36'
$pack = Get-Content (Join-Path $PSScriptRoot '../src/data/local-business-36-template-pack.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$fitIssues = [Collections.Generic.List[object]]::new()
function Brush($hex) { return [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($hex)) }
function RoundedPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$radius) {
  $p = [Drawing.Drawing2D.GraphicsPath]::new()
  $d = [Math]::Min($radius * 2, [Math]::Min($w, $h))
  if ($d -le 0) { $p.AddRectangle([Drawing.RectangleF]::new($x,$y,$w,$h)) }
  else {
    $p.AddArc($x,$y,$d,$d,180,90); $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
    $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90); $p.AddArc($x,$y+$h-$d,$d,$d,90,90)
    $p.CloseFigure()
  }
  return $p
}
foreach ($category in ($pack.category | Select-Object -Unique)) {
  $sheet = [Drawing.Bitmap]::new(1056,960)
  $sg = [Drawing.Graphics]::FromImage($sheet)
  $sg.Clear([Drawing.Color]::FromArgb(232,235,235))
  $index = 0
  foreach ($template in ($pack | Where-Object category -EQ $category)) {
    $poster = [Drawing.Bitmap]::new(1080,1350)
    $g = [Drawing.Graphics]::FromImage($poster)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'AntiAliasGridFit'
    $g.Clear([Drawing.ColorTranslator]::FromHtml($template.canvas.backgroundColor))
    foreach ($e in ($template.canvas.elements | Sort-Object zIndex)) {
      $rect = [Drawing.RectangleF]::new($e.x,$e.y,$e.width,$e.height)
      if ($e.type -in @('rectangle','circle','button')) {
        $b = Brush $e.backgroundColor
        $p = RoundedPath $e.x $e.y $e.width $e.height $e.borderRadius
        $g.FillPath($b,$p)
        if ($e.borderWidth) { $pen = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($e.borderColor),$e.borderWidth); $g.DrawPath($pen,$p); $pen.Dispose() }
        $p.Dispose(); $b.Dispose()
      }
      if ($e.type -eq 'image') {
        $id = ([uri]$e.src).AbsolutePath.TrimStart('/')
        $img = [Drawing.Image]::FromFile((Join-Path $artifactDir "images/$id.jpg"))
        $ratio = [Math]::Max($e.width/$img.Width,$e.height/$img.Height)
        $cw = $e.width/$ratio; $ch = $e.height/$ratio
        $source = [Drawing.RectangleF]::new(($img.Width-$cw)/2,($img.Height-$ch)/2,$cw,$ch)
        $state = $g.Save(); $p = RoundedPath $e.x $e.y $e.width $e.height $e.borderRadius
        $g.SetClip($p); $g.DrawImage($img,$rect,$source,[Drawing.GraphicsUnit]::Pixel)
        $g.Restore($state); $p.Dispose(); $img.Dispose()
      }
      if ($e.type -in @('text','button')) {
        $copy = [string]$e.content
        if ($e.field -and $template.dynamicFields.($e.field)) { $copy = [string]$template.dynamicFields.($e.field) }
        $family = if ($e.fontFamily -eq 'serif') { 'Georgia' } else { 'Arial' }
        $style = if ([int]$e.fontWeight -ge 600) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular }
        if ($e.textDecorationLine -eq 'line-through') { $style = $style -bor [Drawing.FontStyle]::Strikeout }
        $font = [Drawing.Font]::new($family,[single]$e.fontSize,$style,[Drawing.GraphicsUnit]::Pixel)
        $format = [Drawing.StringFormat]::GenericTypographic.Clone()
        $format.Alignment = switch ($e.textAlign) { 'center' { 'Center' } 'right' { 'Far' } default { 'Near' } }
        $format.LineAlignment = 'Center'
        $format.Trimming = 'None'
        $measured = $g.MeasureString($copy,$font,[Drawing.SizeF]::new($e.width,10000),$format)
        if ($measured.Height -gt $e.height + 2) { $fitIssues.Add(@{slug=$template.slug;element=$e.id;height=$e.height;measuredHeight=[Math]::Round($measured.Height,1);fontSize=$e.fontSize}) }
        $b = Brush $e.color; $g.DrawString($copy,$font,$b,$rect,$format)
        $b.Dispose(); $font.Dispose(); $format.Dispose()
      }
    }
    $x = 18 + ($index % 3)*346; $y = 18 + [Math]::Floor($index/3)*472
    $sg.DrawImage($poster,[Drawing.Rectangle]::new($x,$y,324,405))
    $font = [Drawing.Font]::new('Arial',12,[Drawing.FontStyle]::Bold)
    $sg.DrawString($template.name,$font,[Drawing.Brushes]::Black,[Drawing.RectangleF]::new($x,$y+412,325,40))
    $font.Dispose(); $g.Dispose(); $poster.Dispose(); $index++
  }
  $sheet.Save((Join-Path $artifactDir "$category.png"),[Drawing.Imaging.ImageFormat]::Png)
  $sg.Dispose(); $sheet.Dispose()
}
$fitIssues | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $artifactDir 'text-fit.json') -Encoding UTF8
Write-Output "Rendered 6 category contact sheets; $($fitIssues.Count) text bounds need review."
