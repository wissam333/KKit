// composables/useJobFilter.js
export const useJobFilter = () => {
  const filterJobs = (messages, keywords) => {
    if (!keywords.length) return messages
    return messages.filter(msg => {
      const text = msg.message?.toLowerCase() ?? ''
      return keywords.some(kw => text.includes(kw.toLowerCase()))
    })
  }

  return { filterJobs }
}