import { I18N } from '../../game/i18n';
import type { SupportedLanguage } from '../../game/i18n';

/** The translation table for one language, shared by the HUD subcomponents. */
export type I18nTable = (typeof I18N)[SupportedLanguage];
