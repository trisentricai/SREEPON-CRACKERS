-- AlterTable
-- Focal point used to crop/place an image inside its frame. Defaults to
-- CENTER so existing product/banner images keep their current behaviour.
CREATE TYPE "ImagePosition" AS ENUM ('CENTER', 'TOP', 'TOP_LEFT', 'TOP_RIGHT', 'LEFT', 'RIGHT', 'BOTTOM', 'BOTTOM_LEFT', 'BOTTOM_RIGHT');

ALTER TABLE "ProductImage" ADD COLUMN "objectPosition" "ImagePosition" NOT NULL DEFAULT 'CENTER';

ALTER TABLE "Banner" ADD COLUMN "objectPosition" "ImagePosition" NOT NULL DEFAULT 'CENTER';