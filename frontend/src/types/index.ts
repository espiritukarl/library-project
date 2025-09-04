export type Book = {
  id: string
  openLibraryId?: string | null
  title: string
  isbn?: string | null
  coverUrl?: string | null
  description?: string | null
  publishDate?: string | null
  pageCount?: number | null
}

export type UserBook = {
  id: string
  userId: string
  bookId: string
  status: 'WANT_TO_READ' | 'READING' | 'COMPLETED'
  rating?: number | null
  review?: string | null
  currentPage?: number | null
  book: Book
}

