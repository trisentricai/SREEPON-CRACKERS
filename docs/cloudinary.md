# SriPon — Cloudinary (Media)

Cloudinary is the single media service for SriPon: product images, category
banners, homepage artwork, and admin uploads. The API layer already includes
`backend/src/infrastructure/cloudinary.ts` (client + helpers); the upload
endpoints ship with the catalog/content phases.

## 1. Account & credentials

Create an account at [cloudinary.com](https://cloudinary.com). From the
Dashboard:

| Env var | Source |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloud name (public) |
| `CLOUDINARY_API_KEY` | API key (account settings) |
| `CLOUDINARY_API_SECRET` | API secret (**server only**) |

Set these in `backend/.env` and production env vars.

## 2. Security model

- **Never** expose the API secret to browsers.
- Use **signed uploads** from the backend for admin-provided media.
- Use **unsigned upload presets** only after restricting them (allowed folders,
  max file size, allowed formats) — or avoid them entirely and always sign.
- Store `public_id` in the database, not full URLs, so transforms can change
  without re-uploading.

## 3. Recommended delivery URLs

Original assets upload with a canonical folder per resource:

```
sripon/products/{publicId}
sripon/banners/{placement}/{publicId}
sripon/homepage/{sectionId}
```

Deliveries use Cloudinary transformations (`fetch`/`image` transforms):

- **Product thumbnails**: `w_400,h_400,c_fill,q_auto,f_auto`
- **Product detail**: `w_900,c_limit,q_auto,f_auto`
- **Banners**: `w_1600,h_500,c_fill,q_auto,f_auto`
- **Hero artwork**: `w_1920,c_scale,q_auto,f_auto`

Blur-on-load placeholders: `e_blur:200,w_20,q_auto`.

## 4. Upload flow (planned)

1. Client requests a **signed upload signature** from the backend
   (`POST /admin/media/sign`, later phase).
2. Client uploads the file directly to Cloudinary using the signature.
3. Backend records `publicId` against the product/banner row.

## 5. Cleanup / governance

- On product/image delete, the backend removes or re-points the public_id.
- Review the Media Library regularly for orphaned assets (no DB reference).
- Set upload validation limits (type + size) via upload presets.