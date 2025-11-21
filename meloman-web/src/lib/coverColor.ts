export async function getAverageColorFromImageUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    if (!url) {
      console.debug('[coverColor] No URL provided, using default')
      return resolve('#3b82f6')
    }
    
    console.debug('[coverColor] Extracting color from:', url)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          console.warn('[coverColor] Could not get canvas context')
          return resolve('#3b82f6')
        }
        
        const w = Math.min(img.width, 200)
        const h = Math.min(img.height, 200)
        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        
        const data = ctx.getImageData(0, 0, w, h).data
        if (!data) {
          console.warn('[coverColor] No image data')
          return resolve('#3b82f6')
        }
        
        let r = 0, g = 0, b = 0, count = 0
        // Sample pixels every 5th to be faster
        const step = 5
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            count++
          }
        }
        
        if (count === 0) {
          console.warn('[coverColor] No pixels sampled')
          return resolve('#3b82f6')
        }
        
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        const toHex = (v: number) => ('0' + v.toString(16)).slice(-2)
        const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`
        
        console.debug('[coverColor] Extracted color:', color)
        resolve(color)
      } catch (e) {
        console.error('[coverColor] Canvas error:', e)
        resolve('#3b82f6')
      }
    }
    
    img.onerror = (e) => {
      console.error('[coverColor] Image load error:', e)
      resolve('#3b82f6')
    }
    
    img.src = url
  })
}
