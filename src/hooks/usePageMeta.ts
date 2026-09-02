import { useEffect } from 'react'
import { SITE_URL } from '../lib/site'

interface PageMetaOptions {
  title?: string
  description: string
  path: string
  jsonLd?: Record<string, unknown>
}

export function usePageMeta({ title, description, path, jsonLd }: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} · PixelForge` : 'PixelForge — Private Image Tools'
    document.title = fullTitle
    setMetaTag('description', description)
    setPropertyTag('og:title', fullTitle)
    setPropertyTag('og:description', description)
    setPropertyTag('og:url', `${SITE_URL}${path}`)
    setPropertyTag('twitter:title', fullTitle)
    setPropertyTag('twitter:description', description)
    setCanonical(`${SITE_URL}${path}`)

    document.querySelectorAll('script[data-page-jsonld]').forEach((element) => element.remove())
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.pageJsonld = ''
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [title, description, path, jsonLd])
}

function setMetaTag(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = name
    document.head.appendChild(tag)
  }
  tag.content = content
}

function setPropertyTag(property: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.content = content
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}
