import { defineEndpoint } from '@directus/extensions-sdk'
import { Readable } from 'node:stream'
import { renderPrintJpeg } from '../../shared/printAsset'

/**
 * CMYK JPG @ 300 dpi print download.
 * POST /media-download/print  { fileId, widthCm, heightCm }
 */
export default defineEndpoint((router, context) => {
	const { services, getSchema } = context as any

	router.post('/print', async (req, res) => {
		try {
			const body = req.body ?? {}
			const fileId = String(body.fileId ?? '').trim()
			const widthCm = Number(body.widthCm)
			const heightCm = Number(body.heightCm)

			if (!fileId) {
				return res.status(400).json({ error: 'fileId_required' })
			}
			if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
				return res.status(400).json({ error: 'invalid_print_size' })
			}

			const schema = await getSchema()
			const acc = (req as any).accountability ?? null

			const { AssetsService } = services
			const assetsService = new AssetsService({
				schema,
				accountability: acc,
			})

			const { stream, file } = await assetsService.getAsset(fileId)

			const { buffer, filename } = await renderPrintJpeg(
				{ stream: stream as Readable, file },
				widthCm,
				heightCm,
				fileId,
			)

			res.setHeader('Content-Type', 'image/jpeg')
			res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`)
			res.setHeader('Content-Length', String(buffer.byteLength))
			return res.status(200).send(buffer)
		} catch (err: any) {
			console.error('[media-download] print failed:', err)
			if (err?.status === 400 || err?.message === 'not_raster_image') {
				return res.status(400).json({ error: 'not_raster_image' })
			}
			const status = err?.status || err?.statusCode || 500
			return res.status(status >= 400 && status < 600 ? status : 500).json({
				error: 'print_failed',
				message: err?.message ?? 'Print transform failed',
			})
		}
	})
})
