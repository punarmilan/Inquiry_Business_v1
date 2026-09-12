Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class HeroMatte {
 public static void Clean(string source, string destination) {
  using (var original = new Bitmap(source))
  using (var bmp = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb)) {
   using(var g = Graphics.FromImage(bmp)) g.DrawImageUnscaled(original, 0, 0);
   int w=bmp.Width,h=bmp.Height;
   var data=bmp.LockBits(new Rectangle(0,0,w,h),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
   byte[] pixels=new byte[data.Stride*h]; Marshal.Copy(data.Scan0,pixels,0,pixels.Length);
   bool[] matte=new bool[w*h]; var queue=new Queue<int>();
   // Flood only neutral, light pixels connected to the canvas boundary.
   // This leaves skin, clothing and enclosed phone highlights untouched.
   Action<int> visit = index => {
    if(matte[index]) return;
    int p=(index/w)*data.Stride+(index%w)*4;
    int b=pixels[p],g=pixels[p+1],r=pixels[p+2];
    if(pixels[p+3]==0 || (Math.Min(r,Math.Min(g,b))>130 && Math.Max(r,Math.Max(g,b))-Math.Min(r,Math.Min(g,b))<27)) { matte[index]=true; queue.Enqueue(index); }
   };
   for(int x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
   for(int y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
   while(queue.Count>0){int n=queue.Dequeue(),x=n%w,y=n/w;if(x>0)visit(n-1);if(x<w-1)visit(n+1);if(y>0)visit(n-w);if(y<h-1)visit(n+w);}
   for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
    int n=y*w+x,p=y*data.Stride+x*4;
    if(matte[n]){pixels[p+3]=0;continue;}
    // Subpixel feather at the extracted edge, without blurring the subject.
    int adjacent=0;
    for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) {
     int xx=x+dx, yy=y+dy; if(xx>=0&&xx<w&&yy>=0&&yy<h&&matte[yy*w+xx]) adjacent++;
    }
    if(adjacent>0) pixels[p+3]=(byte)Math.Max(0,255-adjacent*24);
   }
   Marshal.Copy(pixels,0,data.Scan0,pixels.Length); bmp.UnlockBits(data);
   bmp.Save(destination,ImageFormat.Png);
  }
 }
}
'@
$framesDirectory = Join-Path $PSScriptRoot '../public/hero-motion'
Get-ChildItem -LiteralPath $framesDirectory -Filter 'frame-*.png' | ForEach-Object {
  $cleanedPath = Join-Path $framesDirectory ($_.BaseName + '-clean.png')
  [HeroMatte]::Clean($_.FullName, $cleanedPath)
  Write-Output $cleanedPath
}
