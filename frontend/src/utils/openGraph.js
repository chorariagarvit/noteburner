import { useEffect } from 'react';

/**
 * Update Open Graph meta tags dynamically
 * @param {Object} options - Meta tag options
 */
export function useOpenGraph({ title, description, url, image } = {}) {
  useEffect(() => {
    const defaultTitle = '🔒 You received a secret message';
    const defaultDescription = 'Someone sent you a self-destructing encrypted message via NoteBurner. Click to reveal it before it burns!';
    const defaultImage = '/og-image.png';

    // Update or create meta tags
    const updateMetaTag = (property, content) => {
      if (!content) return;

      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.querySelector(`meta[name="${property}"]`);
      }
      
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
      }
    };

    // Update Open Graph tags
    updateMetaTag('og:title', title || defaultTitle);
    updateMetaTag('og:description', description || defaultDescription);
    updateMetaTag('og:image', image || defaultImage);
    
    if (url) {
      updateMetaTag('og:url', url);
    }

    // Update Twitter Card tags
    updateMetaTag('twitter:title', title || defaultTitle);
    updateMetaTag('twitter:description', description || defaultDescription);
    updateMetaTag('twitter:image', image || defaultImage);

    // Update page title
    if (title) {
      document.title = `${title} - NoteBurner`;
    }
  }, [title, description, url, image]);
}

/**
 * Set default Open Graph tags for message pages
 * (Never reveals actual message content for security)
 */
export function setMessageOpenGraph() {
  useOpenGraph({
    title: '🔒 Secret Message',
    description: 'You received a self-destructing encrypted message. Click to reveal it before it burns!',
    image: '/og-image.png'
  });
}
