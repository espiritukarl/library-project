-- Add BOOKMARKED to ReadingStatus enum and set default on UserBook.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ReadingStatus' AND e.enumlabel = 'BOOKMARKED'
  ) THEN
    ALTER TYPE "ReadingStatus" ADD VALUE 'BOOKMARKED';
  END IF;
END$$;
