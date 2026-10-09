import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: React.ReactNode
  isOpen?: boolean
}

export const ModalPortal: React.FC<ModalPortalProps> = ({ children, isOpen = true }) => {
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(children, document.body)
}
