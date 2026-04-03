// Value Parameters : must be the first letter is Uppercase as 'Title'

export const useTranslate = (object, value) => {
  const { locale } = useI18n();
  if (object && value) {
    const lang = locale.value ? locale.value : "en";
    const langUpperCase = lang.charAt(0).toUpperCase() + lang.slice(1);
    const word = value + langUpperCase;
    return object[`${word}`];
  }
};
