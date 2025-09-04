/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `username` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
