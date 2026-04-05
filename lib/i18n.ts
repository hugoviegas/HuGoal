import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "@/locales/en.json";
import pt from "@/locales/pt.json";

const i18n = createInstance();
const resources = {
  en: { translation: en },
  pt: { translation: pt },
};

const deviceLang = Localization.getLocales()[0]?.languageCode ?? "en";
const supportedLangs = Object.keys(resources);
const defaultLang = supportedLangs.includes(deviceLang) ? deviceLang : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

export default i18n;
