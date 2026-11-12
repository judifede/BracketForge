/**
 * Export an SVG element as a PNG download.
 * @param {SVGElement} svgEl
 * @param {string} [filename]
 * @returns {Promise<void>}
 */
export async function exportSvgAsPng(svgEl, filename = 'bracket.png') {
  if (!svgEl) throw new Error('SVG no encontrado')

  const clone = /** @type {SVGElement} */ (svgEl.cloneNode(true))
  const width = Number(svgEl.getAttribute('width')) || svgEl.clientWidth || 800
  const height = Number(svgEl.getAttribute('height')) || svgEl.clientHeight || 600
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  const serializer = new XMLSerializer()
  const svgText = serializer.serializeToString(clone)
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')
    ctx.fillStyle = '#0b1116'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    await new Promise((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('No se pudo generar PNG'))
          return
        }
        const link = document.createElement('a')
        const pngUrl = URL.createObjectURL(pngBlob)
        link.href = pngUrl
        link.download = filename
        link.click()
        URL.revokeObjectURL(pngUrl)
        resolve()
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar el SVG'))
    img.src = url
  })
}
