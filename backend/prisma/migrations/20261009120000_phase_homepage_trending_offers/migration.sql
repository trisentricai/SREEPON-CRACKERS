-- AlterEnum
-- Add TRENDING_PRODUCTS and TODAYS_OFFERS to the homepage section types so the
-- storefront can surface trending products and current markdowns, managed from
-- the admin Homepage editor.
ALTER TYPE "HomepageSectionType" ADD VALUE IF NOT EXISTS 'TRENDING_PRODUCTS';
ALTER TYPE "HomepageSectionType" ADD VALUE IF NOT EXISTS 'TODAYS_OFFERS';
