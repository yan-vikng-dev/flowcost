import * as React from "react"

export const ModalContainerContext = React.createContext<HTMLElement | null>(null)

export function useModalContainer() {
  return React.useContext(ModalContainerContext)
}

