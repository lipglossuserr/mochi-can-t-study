import { useCallback, useState } from 'react'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '@/firebase/firebase'

const MAX_BYTES = 8 * 1024 * 1024

/**
 * Real image uploads for Community Rooms — v2 backlog. See
 * `backend/firebase/storage.rules` for the write-access rules this
 * relies on (path shape decides who can write where); this hook only
 * handles the client side: validating the file, tracking upload
 * progress, and resolving to a public download URL on success.
 * <p>
 * `upload` takes the destination `path` explicitly rather than
 * deriving it internally — callers know whether they're uploading a
 * community icon (`community-icons/{uid}/...`) or a blog cover
 * (`blog-covers/{communityId}/{uid}/...`), and those two path shapes
 * are checked by genuinely different Storage rules (see that file),
 * so this hook shouldn't be the one deciding which shape applies.
 */
export function useImageUpload() {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File, path: string): Promise<string | null> => {
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return null
    }
    if (file.size > MAX_BYTES) {
      setError('That image is too large — 8MB max.')
      return null
    }

    setProgress(0)
    try {
      const storageRef = ref(storage, path)
      const task = uploadBytesResumable(storageRef, file)

      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
          },
          reject,
          () => resolve(),
        )
      })

      const url = await getDownloadURL(task.snapshot.ref)
      setProgress(null)
      return url
    } catch {
      setError("Upload didn't go through — try again.")
      setProgress(null)
      return null
    }
  }, [])

  return { upload, progress, uploading: progress !== null, error, dismissError: () => setError(null) }
}
