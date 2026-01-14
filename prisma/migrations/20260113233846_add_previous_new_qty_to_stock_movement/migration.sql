-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "newQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "previousQty" INTEGER NOT NULL DEFAULT 0;
