/*
  Warnings:

  - You are about to drop the column `home_post_id` on the `spaces` table. All the data in the column will be lost.
  - You are about to drop the `HomePost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "HomePost" DROP CONSTRAINT "HomePost_user_id_fkey";

-- DropForeignKey
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_home_post_id_fkey";

-- DropIndex
DROP INDEX "spaces_home_post_id_key";

-- AlterTable
ALTER TABLE "spaces" DROP COLUMN "home_post_id";

-- DropTable
DROP TABLE "HomePost";

-- CreateTable
CREATE TABLE "home_posts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_home_posts" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_home_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_posts_user_id_key" ON "home_posts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "space_home_posts_space_id_key" ON "space_home_posts"("space_id");

-- AddForeignKey
ALTER TABLE "home_posts" ADD CONSTRAINT "home_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_home_posts" ADD CONSTRAINT "space_home_posts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
