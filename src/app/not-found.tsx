'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center overflow-visible text-center p-8 gap-4'>
      <span className="text-5xl sm:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-foreground">
        Flowcost
      </span>

      <p className="text-base sm:text-lg text-muted-foreground max-w-md">
        404: This page overspent its budget and has been repossessed.
      </p>

      <Link
        href="/"
        className="mt-2 inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition"
      >
        Take me home
      </Link>
    </div>
  )
}


