import { useRef, useEffect } from 'react'

export const useChatScroll = <T>(dep: T): React.MutableRefObject<HTMLDivElement> => {
  const ref = useRef<HTMLDivElement>()
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [dep])
  return ref
}
