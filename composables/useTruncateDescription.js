// composables/useTruncateDescription.js
export function useTruncateDescription(desc, wordLimit) {
  if (!desc) {
    return "";
  }
  const words = desc?.split(" ");
  if (words?.length <= wordLimit) {
    return desc;
  }
  return words?.slice(0, wordLimit).join(" ") + "...";
}
